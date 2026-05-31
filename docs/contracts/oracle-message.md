# OracleMessage

> `contracts/contracts/OracleMessage.sol` · `Ownable`

The immutable on-chain record of every AI prophecy and its fulfillment score. One prophecy per UTC day, posted by the Oracle AI; one verdict per prophecy, posted by the Evaluator AI. Nothing here can be edited after the fact — that immutability is the whole point.

```solidity
contract OracleMessage is Ownable
```

***

## Why it exists

This contract is the **AI's permanent track record**. Because every prediction (`postProphecy`) and every self-assessment of that prediction (`resolveProphecy`) is a Mantle transaction, the chain becomes an auditable benchmark: you can replay the Oracle's entire history and check, prophecy by prophecy, whether it earned the belief staked on it. That is the Turing-test angle made concrete.

***

## The `Prophecy` struct

```solidity
struct Prophecy {
    uint48 timestamp;        // slot 0, bytes 0-5
    uint8  fulfillmentScore; // slot 0, byte 6   } packed into 8 bytes
    bool   resolved;         // slot 0, byte 7   }
    string text;             // slot 1
    string resolutionReason; // slot 2
    string evidence;         // slot 3
}
```

**Why value types first?** `timestamp`, `fulfillmentScore`, and `resolved` all live in **slot 0**. Both `postProphecy` and `resolveProphecy` perform their existence and state guards by reading that single slot — one `SLOAD` covers every check before any write.

| Field | Meaning |
|---|---|
| `timestamp` | When the prophecy was posted. **Non-zero `timestamp` == "this day has a prophecy."** |
| `fulfillmentScore` | 0–100 verdict from the Evaluator. Default `0` until resolved. |
| `resolved` | Whether the Evaluator has scored it yet. |
| `text` | The prophecy itself — the Oracle's words. |
| `resolutionReason` | The Evaluator's human-readable justification for the score. |
| `evidence` | A snapshot of the chain/world data the verdict was based on. |

***

## State

```solidity
address public oracle;                          // the only address allowed to post/resolve
mapping(uint256 => Prophecy) private _prophecies; // day index => Prophecy
uint256 public totalProphecies;                 // lifetime count
```

The day index is always `block.timestamp / 1 days`.

***

## Functions

| Function | Access | Purpose | Reverts |
|---|---|---|---|
| `postProphecy(string text)` → `uint256 day` | `onlyOracle` | Post today's prophecy (one per day) | `NotOracle`, `AlreadyPosted` |
| `resolveProphecy(uint256 day, uint8 score, string reason, string evidence)` | `onlyOracle` | Score a prophecy with justification + evidence | `NotOracle`, `NoProphecyForDay`, `AlreadyResolved`, `InvalidScore` (`score > 100`) |
| `getProphecy(uint256 day)` → `Prophecy` | view | Fetch any day's prophecy | — |
| `todaysProphecy()` → `Prophecy` | view | Fetch the current day's prophecy | — |
| `setOracle(address)` | `onlyOwner` | Rotate the oracle EOA | — |

### `postProphecy`

```solidity
function postProphecy(string calldata text) external onlyOracle returns (uint256 day) {
    day = block.timestamp / 1 days;
    if (_prophecies[day].timestamp != 0) revert AlreadyPosted();
    _prophecies[day].timestamp = uint48(block.timestamp);
    _prophecies[day].text = text;
    unchecked { ++totalProphecies; }
    emit ProphecyDelivered(day, text, block.timestamp);
}
```

`fulfillmentScore = 0` and `resolved = false` are storage defaults, so they cost **no `SSTORE`**. A day with a non-zero `timestamp` can never be overwritten — the prophecy is final the instant it's mined.

### `resolveProphecy`

`fulfillmentScore` and `resolved` share slot 0, so setting both is a **single `SSTORE`**. The verdict can only be written once (`AlreadyResolved`), and only for a day that actually has a prophecy (`NoProphecyForDay`).

***

## Events

```solidity
event ProphecyDelivered(uint256 indexed day, string text, uint256 timestamp);
event ProphecyResolved(uint256 indexed day, uint8 score, string reason, string evidence);
event OracleUpdated(address indexed newOracle);
```

The frontend's prophecy archive (`/prophecies`) and landing prophecy ticker are built by reading these events and the `getProphecy` view.

***

## Custom errors

`NotOracle` · `AlreadyPosted` · `AlreadyResolved` · `NoProphecyForDay` · `InvalidScore`

***

## Who calls what

| Caller | Calls |
|---|---|
| **AI #1 — Oracle** (`agent/src/generateProphecy.ts` → `postToChain.ts`) | `postProphecy` |
| **AI #2 — Evaluator** (`agent/src/evaluateProphecy.ts` → `postToChain.ts`) | `resolveProphecy` |
| **Frontend** | `todaysProphecy`, `getProphecy`, `totalProphecies` (read-only) |

See [AI #1 — The Oracle](../ai-agents/oracle.md) and [AI #2 — The Evaluator](../ai-agents/evaluator.md).
