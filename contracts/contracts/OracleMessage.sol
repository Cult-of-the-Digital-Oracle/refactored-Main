// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Immutable on-chain record of every AI prophecy and its fulfillment score.
///         The oracle EOA (AI agent wallet) is the only caller allowed to post/resolve.
contract OracleMessage is Ownable {
    // Packed: fulfillmentScore (1 byte) + resolved (1 byte) share one slot.
    // text and timestamp first so dynamic fields don't split the packed pair.
    struct Prophecy {
        string text;             // slot 0 (length), data at keccak(slot)
        uint256 timestamp;       // slot 1
        uint8 fulfillmentScore;  // slot 2, byte 0 — packed with resolved
        bool resolved;           // slot 2, byte 1
        string resolutionReason; // slot 3
        string evidence;         // slot 4
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

    // Replaces uint256[] prophecyDays — array push cost ~20k gas per call vs simple increment.
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
        if (bytes(_prophecies[day].text).length > 0) revert AlreadyPosted();

        // Field-by-field write: avoids writing zero-value fields to cold storage slots.
        _prophecies[day].text = text;
        _prophecies[day].timestamp = block.timestamp;
        // fulfillmentScore=0, resolved=false are storage defaults — no SSTORE needed.

        ++totalProphecies;

        emit ProphecyDelivered(day, text, block.timestamp);
    }

    /// @notice Score a prophecy with reason and evidence snapshot.
    function resolveProphecy(
        uint256 day,
        uint8 score,
        string calldata reason,
        string calldata evidence
    ) external onlyOracle {
        if (bytes(_prophecies[day].text).length == 0) revert NoProphecyForDay();
        if (_prophecies[day].resolved) revert AlreadyResolved();
        if (score > 100) revert InvalidScore();

        // fulfillmentScore + resolved packed in same slot → single SSTORE for both.
        _prophecies[day].fulfillmentScore = score;
        _prophecies[day].resolved = true;
        _prophecies[day].resolutionReason = reason;
        _prophecies[day].evidence = evidence;

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
