// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Disciples stake USDY and receive a soulbound Disciple NFT.
///         Soulbound — transfers blocked except mint/burn.
contract TempleVault is ERC721, Ownable {
    using SafeERC20 for IERC20;

    // Slot 0: address(20) + uint88(11) + bool(1)  = 32 bytes — exact pack
    // Slot 1: uint128(16) + uint64(8)  + uint64(8) = 32 bytes — exact pack
    //
    // uint88  stakeAmount : up to ~309 trillion USDY at 6 decimals
    // uint128 karma       : astronomically large, never overflows in practice
    // uint64  joinedAt    : unix timestamp, valid until year 585B
    // uint64  exitedAt    : same
    struct Disciple {
        address disciple;    // slot 0: bytes  0-19
        uint88  stakeAmount; // slot 0: bytes 20-30
        bool    active;      // slot 0: byte  31
        uint128 karma;       // slot 1: bytes  0-15
        uint64  joinedAt;    // slot 1: bytes 16-23
        uint64  exitedAt;    // slot 1: bytes 24-31
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

    // totalFaith + nextId packed in one slot: 16 + 16 = 32 bytes.
    // enter() reads nextId and writes totalFaith — same SLOAD covers both.
    uint128 public totalFaith;
    uint128 public nextId = 1;

    mapping(uint256 => Disciple) public disciples;
    mapping(address => uint256) public cardOf;
    mapping(address => uint256) public lastCheckInDay;
    mapping(address => uint256) public lastShareDay;

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

        // nextId + totalFaith are packed — single SLOAD + single SSTORE covers both.
        unchecked { tokenId = nextId++; }
        _safeMint(msg.sender, tokenId);

        // Slot 0: disciple + stakeAmount + active — optimizer emits 1 SSTORE.
        // Slot 1: karma(0 default) + joinedAt — optimizer writes joinedAt into packed slot.
        Disciple storage d = disciples[tokenId];
        d.disciple   = msg.sender;
        d.stakeAmount = uint88(amount);
        d.active      = true;
        d.joinedAt    = uint64(block.timestamp);
        // karma=0, exitedAt=0 are storage defaults — no extra SSTORE.

        cardOf[msg.sender] = tokenId;
        unchecked { totalFaith += uint128(amount); }

        emit Entered(msg.sender, tokenId, amount);
    }

    /// @notice Unstake USDY and burn NFT. Loses Disciple status.
    function exit(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotDisciple();

        Disciple storage d = disciples[tokenId];
        uint256 amount = d.stakeAmount;
        // active + stakeAmount share slot 0 — read-modify-write in one SSTORE.
        d.active   = false;
        // exitedAt in slot 1 alongside karma+joinedAt.
        d.exitedAt = uint64(block.timestamp);
        unchecked { totalFaith -= uint128(amount); }
        cardOf[msg.sender] = 0;

        _burn(tokenId);
        usdy.safeTransfer(msg.sender, amount);

        emit Exited(msg.sender, tokenId);
    }

    /// @notice Oracle grants karma to a disciple (for faith actions).
    function grantKarma(uint256 tokenId, uint256 amount) external onlyOracle {
        if (!disciples[tokenId].active) revert NotDisciple();
        unchecked { disciples[tokenId].karma += uint128(amount); }
        emit KarmaGranted(tokenId, amount);
    }

    /// @notice Daily public faith action. One check-in per Disciple per UTC day.
    function checkIn(uint256 tokenId) external {
        if (cardOf[msg.sender] != tokenId) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastCheckInDay[msg.sender] == day) revert AlreadyCheckedIn();

        lastCheckInDay[msg.sender] = day;
        unchecked { disciples[tokenId].karma += 5; }

        emit FaithCheckedIn(msg.sender, tokenId, day, 5);
    }

    /// @notice User-attested share action. One share reward per UTC day.
    function recordShare(uint256 tokenId, string calldata channel) external {
        if (cardOf[msg.sender] != tokenId) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastShareDay[msg.sender] == day) revert AlreadyShared();

        lastShareDay[msg.sender] = day;
        unchecked { disciples[tokenId].karma += 3; }

        emit FaithShared(msg.sender, tokenId, day, channel, 3);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    /// @notice Original owner address for blessing claims (survives burn).
    function claimantOf(uint256 tokenId) external view returns (address) {
        return disciples[tokenId].disciple;
    }

    /// @notice Stake amount at a historical timestamp for pro-rata blessing calc.
    function eligibleStakeAt(uint256 tokenId, uint256 timestamp) external view returns (uint256) {
        Disciple memory d = disciples[tokenId];
        // Slot 0 + slot 1 = 2 SLOADs covers all fields needed.
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
