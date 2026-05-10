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

    struct BlessingRound {
        uint256 day;           // prophecy day index
        uint256 yieldPool;     // total USDY to distribute
        uint256 totalFaithSnap; // totalFaith snapshot at queue time
        bool settled;
    }

    error NotOracle();
    error RoundNotFound();
    error AlreadyClaimed();
    error NothingToClaim();
    error InsufficientYieldPool();

    event BlessingQueued(uint256 indexed roundId, uint256 day, uint256 yieldPool);
    event BlessingClaimed(uint256 indexed roundId, uint256 indexed tokenId, address indexed disciple, uint256 amount);

    IERC20 public immutable usdy;
    TempleVault public immutable vault;
    address public oracle;

    uint256 public nextRoundId = 1;
    mapping(uint256 => BlessingRound) public rounds;

    /// roundId → tokenId → claimed
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
        usdy.safeTransferFrom(msg.sender, address(this), yieldAmount);

        uint256 id = nextRoundId++;
        rounds[id] = BlessingRound({
            day: day,
            yieldPool: yieldAmount,
            totalFaithSnap: vault.totalFaith(),
            settled: false
        });

        emit BlessingQueued(id, day, yieldAmount);
    }

    /// @notice Disciple claims their share from a specific round.
    function claim(uint256 roundId, uint256 tokenId) external {
        BlessingRound storage r = rounds[roundId];
        if (r.yieldPool == 0) revert RoundNotFound();
        if (claimed[roundId][tokenId]) revert AlreadyClaimed();

        // verify caller owns the token
        require(vault.ownerOf(tokenId) == msg.sender, "not your NFT");

        (uint256 stakeAmount,,,) = vault.disciples(tokenId);
        if (stakeAmount == 0) revert NothingToClaim();

        uint256 share = (stakeAmount * r.yieldPool) / r.totalFaithSnap;
        if (share == 0) revert NothingToClaim();

        claimed[roundId][tokenId] = true;
        usdy.safeTransfer(msg.sender, share);

        emit BlessingClaimed(roundId, tokenId, msg.sender, share);
    }

    /// @notice Preview how much a token would claim from a round.
    function pendingBlessing(uint256 roundId, uint256 tokenId) external view returns (uint256) {
        BlessingRound storage r = rounds[roundId];
        if (r.yieldPool == 0 || claimed[roundId][tokenId]) return 0;
        (uint256 stakeAmount,,,) = vault.disciples(tokenId);
        if (stakeAmount == 0 || r.totalFaithSnap == 0) return 0;
        return (stakeAmount * r.yieldPool) / r.totalFaithSnap;
    }

    /// @notice Owner can seed the yield pool directly (for hackathon demo).
    function seedYield(uint256 amount) external onlyOwner {
        usdy.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}
