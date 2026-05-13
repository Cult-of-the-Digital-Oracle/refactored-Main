// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Immutable on-chain record of every AI prophecy and its fulfillment score.
///         The oracle EOA (AI agent wallet) is the only caller allowed to post/resolve.
contract OracleMessage is Ownable {
    struct Prophecy {
        string text;
        uint256 timestamp;
        uint8 fulfillmentScore; // 0-100; 0 = unresolved
        string resolutionReason;
        string evidence;
        bool resolved;
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

    /// day index (block.timestamp / 1 days) → Prophecy
    mapping(uint256 => Prophecy) private _prophecies;
    uint256[] public prophecyDays;

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

        _prophecies[day] = Prophecy({
            text: text,
            timestamp: block.timestamp,
            fulfillmentScore: 0,
            resolutionReason: "",
            evidence: "",
            resolved: false
        });
        prophecyDays.push(day);

        emit ProphecyDelivered(day, text, block.timestamp);
    }

    /// @notice Score yesterday's (or any past) prophecy. Score 0-100.
    function resolveProphecy(uint256 day, uint8 score) external onlyOracle {
        _resolveProphecy(day, score, "", "");
    }

    /// @notice Score a prophecy with a short reason and evidence snapshot.
    function resolveProphecy(
        uint256 day,
        uint8 score,
        string calldata reason,
        string calldata evidence
    ) external onlyOracle {
        _resolveProphecy(day, score, reason, evidence);
    }

    function _resolveProphecy(
        uint256 day,
        uint8 score,
        string memory reason,
        string memory evidence
    ) internal {
        if (bytes(_prophecies[day].text).length == 0) revert NoProphecyForDay();
        if (_prophecies[day].resolved) revert AlreadyResolved();
        if (score > 100) revert InvalidScore();

        _prophecies[day].fulfillmentScore = score;
        _prophecies[day].resolutionReason = reason;
        _prophecies[day].evidence = evidence;
        _prophecies[day].resolved = true;

        emit ProphecyResolved(day, score, reason, evidence);
    }

    function getProphecy(uint256 day) external view returns (Prophecy memory) {
        return _prophecies[day];
    }

    function todaysProphecy() external view returns (Prophecy memory) {
        return _prophecies[block.timestamp / 1 days];
    }

    function totalProphecies() external view returns (uint256) {
        return prophecyDays.length;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }
}
