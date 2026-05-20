// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Disciples stake USDY here and receive a soulbound Disciple NFT (ERC-8004 pattern).
///         NFT encodes stake amount, join time, and karma. Soulbound — no transfers.
contract TempleVault is ERC721, Ownable {
    using SafeERC20 for IERC20;

    // Slot 0: address(20) + uint88(11) + bool(1) = 32 bytes — perfect pack.
    // uint88 stakeAmount supports up to ~309 trillion USDY at 6 decimals.
    struct Disciple {
        address disciple;   // 20 bytes \
        uint88 stakeAmount; // 11 bytes  } slot 0 (32 bytes, fully packed)
        bool active;        //  1 byte  /
        uint256 joinedAt;   // slot 1
        uint256 exitedAt;   // slot 2
        uint256 karma;      // slot 3
    }

    error Soulbound();
    error AlreadyDisciple();
    error NotDisciple();
    error ZeroStake();
    error NotOracle();
    error AlreadyCheckedIn();
    error AlreadyShared();

    event Entered(address indexed disciple, uint256 indexed tokenId, uint256 amount);
    event Exited(address indexed disciple, uint256 indexed tokenId);
    event KarmaGranted(uint256 indexed tokenId, uint256 amount);
    event FaithCheckedIn(address indexed disciple, uint256 indexed tokenId, uint256 day, uint256 karmaAwarded);
    event FaithShared(address indexed disciple, uint256 indexed tokenId, uint256 day, string channel, uint256 karmaAwarded);

    IERC20 public immutable usdy;
    address public oracle;

    uint256 public nextId = 1;
    uint256 public totalFaith;

    mapping(uint256 => Disciple) public disciples;
    mapping(address => uint256) public cardOf;
    mapping(uint256 => uint256) public lastCheckInDay;
    mapping(uint256 => uint256) public lastShareDay;

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address _usdy, address _oracle) ERC721("Disciple of the Oracle", "DISC") Ownable(msg.sender) {
        usdy = IERC20(_usdy);
        oracle = _oracle;
    }

    /// @notice Stake USDY → become a Disciple → receive soulbound NFT.
    function enter(uint256 amount) external returns (uint256 tokenId) {
        if (amount == 0) revert ZeroStake();
        if (cardOf[msg.sender] != 0) revert AlreadyDisciple();

        usdy.safeTransferFrom(msg.sender, address(this), amount);

        tokenId = nextId++;
        _safeMint(msg.sender, tokenId);

        // Field-by-field write to packed slot 0 — optimizer combines into 1 SSTORE.
        // joinedAt goes to slot 1. exitedAt=0 and karma=0 are storage defaults, no write.
        Disciple storage d = disciples[tokenId];
        d.disciple = msg.sender;
        d.stakeAmount = uint88(amount);
        d.active = true;
        d.joinedAt = block.timestamp;

        cardOf[msg.sender] = tokenId;
        totalFaith += amount;

        emit Entered(msg.sender, tokenId, amount);
    }

    /// @notice Unstake USDY and burn NFT. Loses Disciple status.
    function exit(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotDisciple();

        Disciple storage d = disciples[tokenId];
        uint256 amount = d.stakeAmount;
        d.active = false;
        d.exitedAt = block.timestamp;
        totalFaith -= amount;
        cardOf[msg.sender] = 0;

        _burn(tokenId);
        usdy.safeTransfer(msg.sender, amount);

        emit Exited(msg.sender, tokenId);
    }

    /// @notice Oracle grants karma to a disciple (for faith actions).
    function grantKarma(uint256 tokenId, uint256 amount) external onlyOracle {
        if (!disciples[tokenId].active) revert NotDisciple();
        disciples[tokenId].karma += amount;
        emit KarmaGranted(tokenId, amount);
    }

    /// @notice Daily public faith action. One check-in per Disciple per UTC day.
    function checkIn(uint256 tokenId) external {
        // cardOf check is a direct SLOAD — cheaper than ownerOf() ERC721 dispatch.
        if (cardOf[msg.sender] != tokenId) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastCheckInDay[tokenId] == day) revert AlreadyCheckedIn();

        lastCheckInDay[tokenId] = day;
        disciples[tokenId].karma += 5;

        // Single event carries all info — removed redundant KarmaGranted emit.
        emit FaithCheckedIn(msg.sender, tokenId, day, 5);
    }

    /// @notice User-attested share action for hackathon virality. One share reward per UTC day.
    function recordShare(uint256 tokenId, string calldata channel) external {
        if (cardOf[msg.sender] != tokenId) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastShareDay[tokenId] == day) revert AlreadyShared();

        lastShareDay[tokenId] = day;
        disciples[tokenId].karma += 3;

        // Single event carries all info — removed redundant KarmaGranted emit.
        emit FaithShared(msg.sender, tokenId, day, channel, 3);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    /// @notice Canonical claimant for historical blessings tied to this Disciple.
    function claimantOf(uint256 tokenId) external view returns (address) {
        return disciples[tokenId].disciple;
    }

    /// @notice Historical eligibility helper for blessing rounds snapped at `timestamp`.
    function eligibleStakeAt(uint256 tokenId, uint256 timestamp) external view returns (uint256) {
        Disciple memory d = disciples[tokenId];
        if (d.disciple == address(0)) return 0;
        if (d.joinedAt > timestamp) return 0;
        if (d.exitedAt != 0 && d.exitedAt <= timestamp) return 0;
        return d.stakeAmount;
    }

    // ── Soulbound: block all transfers except mint/burn ──────────────────────
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
