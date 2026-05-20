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

    // Slot 0: yieldPool(16) + totalFaithSnap(16) = 32 bytes
    // Slot 1: day(8) + queuedAt(8)               = 16 bytes
    // `settled` removed — was dead code, never set to true.
    // Total: 2 slots (down from original 5).
    struct BlessingRound {
        uint128 yieldPool;       // slot 0, bytes  0-15
        uint128 totalFaithSnap;  // slot 0, bytes 16-31
        uint64  day;             // slot 1, bytes  0-7
        uint64  queuedAt;        // slot 1, bytes  8-15
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

        uint256 id;
        unchecked { id = nextRoundId++; }

        // Slot 0 + slot 1 = 2 SSTOREs for the whole round (down from 5).
        BlessingRound storage r = rounds[id];
        r.yieldPool      = uint128(yieldAmount);
        r.totalFaithSnap = uint128(totalFaithSnap);
        r.day            = uint64(day);
        r.queuedAt       = uint64(block.timestamp);

        emit BlessingQueued(id, day, yieldAmount);
    }

    /// @notice Disciple claims their share from a specific round.
    function claim(uint256 roundId, uint256 tokenId) external {
        BlessingRound storage r = rounds[roundId];
        if (r.yieldPool == 0) revert RoundNotFound();
        if (claimed[roundId][tokenId]) revert AlreadyClaimed();
        if (vault.claimantOf(tokenId) != msg.sender) revert NotDisciple();

        uint256 share = _pendingBlessing(r, tokenId);
        if (share == 0) revert NothingToClaim();

        claimed[roundId][tokenId] = true;
        usdy.safeTransfer(msg.sender, share);

        emit BlessingClaimed(roundId, tokenId, msg.sender, share);
    }

    /// @notice Preview claimable amount for a token in a round.
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
        uint128 snap = r.totalFaithSnap;
        if (snap == 0) return 0;
        uint256 stakeAmount = vault.eligibleStakeAt(tokenId, r.queuedAt);
        if (stakeAmount == 0) return 0;
        // stakeAmount <= snap guaranteed by contract invariant.
        return (stakeAmount * r.yieldPool) / snap;
    }
}
