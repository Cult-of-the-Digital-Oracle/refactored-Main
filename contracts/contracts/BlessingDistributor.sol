// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {TempleVault} from "./TempleVault.sol";

/// @notice When a prophecy fulfills, oracle queues a blessing round.
///         Each active Disciple claims their pro-rata share of the yield pool.
contract BlessingDistributor is Ownable {
    using SafeERC20 for IERC20;

    // Packed from 5 slots → 2 slots:
    //   slot 0: yieldPool(16) + totalFaithSnap(16) = 32 bytes
    //   slot 1: day(8) + queuedAt(8) + settled(1) = 17 bytes
    // uint128 yieldPool supports ~340T USDY at 6 decimals.
    // uint64 day/queuedAt supports timestamps well past year 500B.
    struct BlessingRound {
        uint128 yieldPool;       // slot 0, bytes 0-15
        uint128 totalFaithSnap;  // slot 0, bytes 16-31
        uint64 day;              // slot 1, bytes 0-7
        uint64 queuedAt;         // slot 1, bytes 8-15
        bool settled;            // slot 1, byte 16
    }

    error NotOracle();
    error RoundNotFound();
    error AlreadyClaimed();
    error NothingToClaim();
    error InsufficientYieldPool();
    error NoActiveFaith();
    error NotDisciple();

    event BlessingQueued(uint256 indexed roundId, uint256 day, uint256 yieldPool);
    event BlessingClaimed(uint256 indexed roundId, uint256 indexed tokenId, address indexed disciple, uint256 amount);

    IERC20 public immutable usdy;
    TempleVault public immutable vault;
    address public oracle;

    uint256 public nextRoundId = 1;
    mapping(uint256 => BlessingRound) public rounds;
    mapping(uint256 => mapping(uint256 => bool)) public claimed;

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address _usdy, address _vault, address _oracle) Ownable(msg.sender) {
        usdy = IERC20(_usdy);
        vault = TempleVault(_vault);
        oracle = _oracle;
    }

    /// @notice Oracle queues a blessing round after a prophecy fulfills.
    ///         Caller must have pre-approved `yieldAmount` USDY to this contract.
    function queueBlessing(uint256 day, uint256 yieldAmount) external onlyOracle {
        if (yieldAmount == 0) revert InsufficientYieldPool();
        uint256 totalFaithSnap = vault.totalFaith();
        if (totalFaithSnap == 0) revert NoActiveFaith();
        usdy.safeTransferFrom(msg.sender, address(this), yieldAmount);

        uint256 id = nextRoundId++;
        // Field-by-field write — optimizer combines slot 0 (yieldPool+totalFaithSnap)
        // and slot 1 (day+queuedAt+settled) into 2 SSTOREs instead of 5.
        BlessingRound storage r = rounds[id];
        r.yieldPool = uint128(yieldAmount);
        r.totalFaithSnap = uint128(totalFaithSnap);
        r.day = uint64(day);
        r.queuedAt = uint64(block.timestamp);
        // settled defaults to false — no SSTORE needed.

        emit BlessingQueued(id, day, yieldAmount);
    }

    /// @notice Disciple claims their share from a specific round.
    function claim(uint256 roundId, uint256 tokenId) external {
        BlessingRound storage r = rounds[roundId];
        if (r.yieldPool == 0) revert RoundNotFound();
        if (claimed[roundId][tokenId]) revert AlreadyClaimed();
        // Custom error — cheaper than require string (~200 gas saved).
        if (vault.claimantOf(tokenId) != msg.sender) revert NotDisciple();

        uint256 share = _pendingBlessing(r, tokenId);
        if (share == 0) revert NothingToClaim();

        claimed[roundId][tokenId] = true;
        usdy.safeTransfer(msg.sender, share);

        emit BlessingClaimed(roundId, tokenId, msg.sender, share);
    }

    /// @notice Preview how much a token would claim from a round.
    function pendingBlessing(uint256 roundId, uint256 tokenId) external view returns (uint256) {
        BlessingRound storage r = rounds[roundId];
        if (r.yieldPool == 0 || claimed[roundId][tokenId]) return 0;
        return _pendingBlessing(r, tokenId);
    }

    /// @notice Owner can seed the yield pool directly (for hackathon demo).
    function seedYield(uint256 amount) external onlyOwner {
        usdy.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function _pendingBlessing(BlessingRound storage r, uint256 tokenId) internal view returns (uint256) {
        if (r.totalFaithSnap == 0) return 0;
        uint256 stakeAmount = vault.eligibleStakeAt(tokenId, r.queuedAt);
        if (stakeAmount == 0) return 0;
        return (stakeAmount * r.yieldPool) / r.totalFaithSnap;
    }
}
