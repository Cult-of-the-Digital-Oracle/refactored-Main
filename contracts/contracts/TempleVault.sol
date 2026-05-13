// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Disciples stake USDY here and receive a soulbound Disciple NFT (ERC-8004 pattern).
///         NFT encodes stake amount, join time, and karma. Soulbound — no transfers.
contract TempleVault is ERC721URIStorage, Ownable {
    using SafeERC20 for IERC20;

    struct Disciple {
        address disciple;
        uint256 stakeAmount;   // USDY staked (6 decimals)
        uint256 joinedAt;
        uint256 exitedAt;
        uint256 karma;
        bool active;
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
    uint256 public totalFaith; // total USDY staked across all disciples

    mapping(uint256 => Disciple) public disciples;
    mapping(address => uint256) public cardOf; // wallet → tokenId (0 = none)
    mapping(uint256 => uint256) public lastCheckInDay; // tokenId -> day index
    mapping(uint256 => uint256) public lastShareDay; // tokenId -> day index

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

        disciples[tokenId] = Disciple({
            disciple: msg.sender,
            stakeAmount: amount,
            joinedAt: block.timestamp,
            exitedAt: 0,
            karma: 0,
            active: true
        });
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
        if (ownerOf(tokenId) != msg.sender) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastCheckInDay[tokenId] == day) revert AlreadyCheckedIn();

        lastCheckInDay[tokenId] = day;
        disciples[tokenId].karma += 5;

        emit FaithCheckedIn(msg.sender, tokenId, day, 5);
        emit KarmaGranted(tokenId, 5);
    }

    /// @notice User-attested share action for hackathon virality. One share reward per UTC day.
    function recordShare(uint256 tokenId, string calldata channel) external {
        if (ownerOf(tokenId) != msg.sender) revert NotDisciple();
        if (!disciples[tokenId].active) revert NotDisciple();

        uint256 day = block.timestamp / 1 days;
        if (lastShareDay[tokenId] == day) revert AlreadyShared();

        lastShareDay[tokenId] = day;
        disciples[tokenId].karma += 3;

        emit FaithShared(msg.sender, tokenId, day, channel, 3);
        emit KarmaGranted(tokenId, 3);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOracle {
        _setTokenURI(tokenId, uri);
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
