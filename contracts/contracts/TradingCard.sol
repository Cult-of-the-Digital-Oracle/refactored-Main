// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// ERC-8004-style identity card. One per wallet (soulbound by default).
/// Stats are derived off-chain by an AI agent and committed at mint.
contract TradingCard is ERC721URIStorage, Ownable {
    struct Stats {
        uint16 atk;
        uint16 def;
        uint16 vibe;
        uint32 mintedAt;
    }

    error AlreadyMinted();
    error Soulbound();

    event CardMinted(address indexed owner, uint256 indexed tokenId, Stats stats);

    uint256 public nextId = 1;
    mapping(uint256 => Stats) public statsOf;
    mapping(address => uint256) public cardOf;

    constructor() ERC721("Mantle Trading Card", "MTC") Ownable(msg.sender) {}

    function mint(address to, Stats calldata s, string calldata uri) external onlyOwner returns (uint256 id) {
        if (cardOf[to] != 0) revert AlreadyMinted();
        id = nextId++;
        _safeMint(to, id);
        _setTokenURI(id, uri);
        statsOf[id] = s;
        cardOf[to] = id;
        emit CardMinted(to, id, s);
    }

    /// Soulbound: block all transfers except mint/burn.
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
