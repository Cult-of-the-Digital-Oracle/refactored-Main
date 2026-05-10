// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {TradingCard} from "./TradingCard.sol";

/// Minimal escrow PvP. Challenger opens a battle with a stake.
/// Defender accepts; an off-chain AI agent (the resolver) settles the winner.
contract BattleArena {
    enum Status { Open, Accepted, Settled, Cancelled }

    struct Battle {
        address challenger;
        address defender;
        uint256 stake;
        Status status;
    }

    error NotResolver();
    error BadState();
    error WrongValue();

    event BattleOpened(uint256 indexed id, address indexed challenger, uint256 stake);
    event BattleAccepted(uint256 indexed id, address indexed defender);
    event BattleSettled(uint256 indexed id, address indexed winner);

    address public immutable resolver;
    TradingCard public immutable card;

    uint256 public nextId = 1;
    mapping(uint256 => Battle) public battles;

    constructor(address _resolver, address _card) {
        resolver = _resolver;
        card = TradingCard(_card);
    }

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    function open() external payable returns (uint256 id) {
        if (msg.value == 0) revert WrongValue();
        require(card.cardOf(msg.sender) != 0, "no card");
        id = nextId++;
        battles[id] = Battle(msg.sender, address(0), msg.value, Status.Open);
        emit BattleOpened(id, msg.sender, msg.value);
    }

    function accept(uint256 id) external payable {
        Battle storage b = battles[id];
        if (b.status != Status.Open) revert BadState();
        if (msg.value != b.stake) revert WrongValue();
        require(card.cardOf(msg.sender) != 0, "no card");
        b.defender = msg.sender;
        b.status = Status.Accepted;
        emit BattleAccepted(id, msg.sender);
    }

    function settle(uint256 id, address winner) external onlyResolver {
        Battle storage b = battles[id];
        if (b.status != Status.Accepted) revert BadState();
        require(winner == b.challenger || winner == b.defender, "bad winner");
        b.status = Status.Settled;
        (bool ok, ) = winner.call{value: b.stake * 2}("");
        require(ok, "payout fail");
        emit BattleSettled(id, winner);
    }

    function cancel(uint256 id) external {
        Battle storage b = battles[id];
        if (b.status != Status.Open || msg.sender != b.challenger) revert BadState();
        b.status = Status.Cancelled;
        (bool ok, ) = msg.sender.call{value: b.stake}("");
        require(ok, "refund fail");
    }
}
