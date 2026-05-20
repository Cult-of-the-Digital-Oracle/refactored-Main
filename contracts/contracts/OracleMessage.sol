// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Immutable on-chain record of every AI prophecy and its fulfillment score.
///         The oracle EOA (AI agent wallet) is the only caller allowed to post/resolve.
contract OracleMessage is Ownable {
    // Slot layout (4 slots per Prophecy):
    //   slot 0: timestamp(6) + fulfillmentScore(1) + resolved(1) = 8 bytes — packed
    //   slot 1: text (string length pointer)
    //   slot 2: resolutionReason (string length pointer)
    //   slot 3: evidence (string length pointer)
    //
    // Putting value types FIRST means postProphecy + resolveProphecy both hit
    // slot 0 in a single SLOAD to perform all guard checks.
    struct Prophecy {
        uint48 timestamp;        // slot 0, bytes 0-5
        uint8 fulfillmentScore;  // slot 0, byte 6  } 8 bytes packed
        bool resolved;           // slot 0, byte 7  }
        string text;             // slot 1
        string resolutionReason; // slot 2
        string evidence;         // slot 3
    }

    error NotOracle();
    error AlreadyPosted();
    error AlreadyResolved();
    error NoProphecyForDay();
    error InvalidScore();

    event ProphecyDelivered(uint256 indexed day, string text, uint256 timestamp);
    event ProphecyResolved(uint256 indexed day, uint8 score, string reason, string evidence);
    event OracleUpdated(address indexed newOracle);

    address public oracle;
    mapping(uint256 => Prophecy) private _prophecies;
    uint256 public totalProphecies;

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address _oracle) Ownable(msg.sender) {
        oracle = _oracle;
    }

    /// @notice Post today's prophecy. One per day.
    function postProphecy(string calldata text) external onlyOracle returns (uint256 day) {
        day = block.timestamp / 1 days;
        // timestamp in slot 0 — single SLOAD to check existence.
        if (_prophecies[day].timestamp != 0) revert AlreadyPosted();

        _prophecies[day].timestamp = uint48(block.timestamp);
        _prophecies[day].text = text;
        // fulfillmentScore=0, resolved=false are storage defaults — no SSTORE.

        unchecked { ++totalProphecies; }

        emit ProphecyDelivered(day, text, block.timestamp);
    }

    /// @notice Score a prophecy with reason and evidence snapshot.
    function resolveProphecy(
        uint256 day,
        uint8 score,
        string calldata reason,
        string calldata evidence
    ) external onlyOracle {
        Prophecy storage p = _prophecies[day];
        // Both checks hit slot 0 — optimizer issues single SLOAD for the pointer.
        if (p.timestamp == 0) revert NoProphecyForDay();
        if (p.resolved) revert AlreadyResolved();
        if (score > 100) revert InvalidScore();

        // fulfillmentScore + resolved share slot 0 — one SSTORE for both.
        p.fulfillmentScore = score;
        p.resolved = true;
        p.resolutionReason = reason;
        p.evidence = evidence;

        emit ProphecyResolved(day, score, reason, evidence);
    }

    function getProphecy(uint256 day) external view returns (Prophecy memory) {
        return _prophecies[day];
    }

    function todaysProphecy() external view returns (Prophecy memory) {
        return _prophecies[block.timestamp / 1 days];
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }
}
