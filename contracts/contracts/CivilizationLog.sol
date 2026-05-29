// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Records daily civilization snapshots, divine events executed by Demiurge,
///         and the Demiurge's top-5 daily tool candidates preview.
contract CivilizationLog is Ownable {
    
    struct CivSnapshot {
        bytes32 stateHash;       // keccak256 hash of JSON world state
        uint32  totalEntities;   // count of NPC entities
        uint32  totalPopulation; // total population
        uint64  totalFaith;      // total faith (analog USDY, scaled 1e6)
        uint8   dominantFaction; // 0=believer, 1=apostate, 2=balanced
        uint8   activeRegions;   // count of active regions
        uint64  snapshotAt;      // unix timestamp
    }

    struct DivineEvent {
        uint8   toolId;          // 0-9, corresponding to catalog
        uint8   polarity;        // 0=evil, 1=good
        uint64  executedAt;      // unix timestamp
        uint8   targetRegion;    // region index affected (255 = all)
        uint32  magnitude;       // intensity effect (0-1000)
    }

    struct DemiurgePreview {
        uint8[5] toolIds;        // top-5 candidate tool IDs
        uint8[5] weights;        // probability weight 0-100 each
        uint8    forcedPolarity; // 0=evil forced, 1=good forced, 2=free
        uint64   decisionAt;     // unix timestamp of decision
        uint64   scheduledFor;   // unix timestamp scheduled for execution (24h later)
        string   prophecyHash;   // excerpt/hash of prophecy read
    }

    // Storage
    mapping(uint256 => CivSnapshot) private _snapshots; // day => Snapshot
    DivineEvent[] private _divineHistory;
    DemiurgePreview private _latestPreview;
    
    uint256 public totalSnapshotCount;
    address public civEngine;

    // Custom Errors
    error NotCivEngine();
    error SnapshotAlreadyExists();

    // Events
    event SnapshotPosted(uint256 indexed day, bytes32 stateHash, uint32 totalPopulation, uint64 totalFaith);
    event DivineEventLogged(uint256 indexed eventId, uint8 toolId, uint8 polarity, uint64 executedAt);
    event DemiurgePreviewPosted(uint64 scheduledFor, uint8[5] toolIds, uint8 forcedPolarity);
    event CivEngineUpdated(address indexed newEngine);

    modifier onlyCivEngine() {
        if (msg.sender != civEngine) revert NotCivEngine();
        _;
    }

    constructor(address _civEngine) Ownable(msg.sender) {
        civEngine = _civEngine;
        emit CivEngineUpdated(_civEngine);
    }

    /// @notice Set the authorized civilization engine address
    function setCivEngine(address _civEngine) external onlyOwner {
        civEngine = _civEngine;
        emit CivEngineUpdated(_civEngine);
    }

    /// @notice Post a daily civilization snapshot. Only callable by CivEngine
    function postSnapshot(uint256 day, CivSnapshot calldata snap) external onlyCivEngine {
        if (_snapshots[day].snapshotAt != 0) revert SnapshotAlreadyExists();
        _snapshots[day] = snap;
        unchecked {
            ++totalSnapshotCount;
        }
        emit SnapshotPosted(day, snap.stateHash, snap.totalPopulation, snap.totalFaith);
    }

    /// @notice Log a divine event execution. Only callable by CivEngine
    function logDivineEvent(DivineEvent calldata ev) external onlyCivEngine {
        _divineHistory.push(ev);
        uint256 eventId;
        unchecked {
            eventId = _divineHistory.length - 1;
        }
        emit DivineEventLogged(eventId, ev.toolId, ev.polarity, ev.executedAt);
    }

    /// @notice Post a Demiurge top-5 daily tool preview. Only callable by CivEngine (acting on behalf of Demiurge)
    function postDemiurgePreview(DemiurgePreview calldata preview) external onlyCivEngine {
        _latestPreview = preview;
        emit DemiurgePreviewPosted(preview.scheduledFor, preview.toolIds, preview.forcedPolarity);
    }

    /// @notice Fetch a historical snapshot
    function getSnapshot(uint256 day) external view returns (CivSnapshot memory) {
        return _snapshots[day];
    }

    /// @notice Fetch a specific divine event
    function getDivineEvent(uint256 index) external view returns (DivineEvent memory) {
        return _divineHistory[index];
    }

    /// @notice Fetch the total number of divine events
    function getDivineEventCount() external view returns (uint256) {
        return _divineHistory.length;
    }

    /// @notice Get the latest preview
    function getLatestPreview() external view returns (DemiurgePreview memory) {
        return _latestPreview;
    }

    /// @notice Total snapshot count helper
    function totalSnapshots() external view returns (uint256) {
        return totalSnapshotCount;
    }
}
