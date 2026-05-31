# Smart Contract API

The complete external surface of all five contracts. Types are Solidity ABI types. For semantics and storage detail, see each [contract page](../contracts/README.md).

> All amounts denominated in USDY are **6-decimal** units (`1 USDY = 1_000_000`). All `day` values are UTC day indices (`block.timestamp / 1 days`).

***

## OracleMessage

[Contract page →](../contracts/oracle-message.md)

### Functions

| Signature | Mutability | Access |
|---|---|---|
| `postProphecy(string text) → (uint256 day)` | nonpayable | oracle |
| `resolveProphecy(uint256 day, uint8 score, string reason, string evidence)` | nonpayable | oracle |
| `getProphecy(uint256 day) → Prophecy` | view | — |
| `todaysProphecy() → Prophecy` | view | — |
| `totalProphecies() → uint256` | view | — |
| `setOracle(address)` | nonpayable | owner |

`Prophecy = (uint48 timestamp, uint8 fulfillmentScore, bool resolved, string text, string resolutionReason, string evidence)`

### Events

```solidity
ProphecyDelivered(uint256 indexed day, string text, uint256 timestamp)
ProphecyResolved(uint256 indexed day, uint8 score, string reason, string evidence)
OracleUpdated(address indexed newOracle)
```

***

## TempleVault

[Contract page →](../contracts/temple-vault.md) · ERC-721 `"Disciple of the Oracle"` (`DISC`), soulbound

### Functions

| Signature | Mutability | Access |
|---|---|---|
| `enter(uint256 amount) → (uint256 tokenId)` | nonpayable | public |
| `exit(uint256 tokenId)` | nonpayable | token owner |
| `checkIn(uint256 tokenId)` | nonpayable | the Disciple |
| `recordShare(uint256 tokenId, string channel)` | nonpayable | the Disciple |
| `grantKarma(uint256 tokenId, uint256 amount)` | nonpayable | oracle |
| `cardOf(address) → uint256` | view | — |
| `disciples(uint256) → (address,uint88,bool,uint128,uint64,uint64)` | view | — |
| `lastCheckInDay(address) → uint256` | view | — |
| `lastShareDay(address) → uint256` | view | — |
| `totalFaith() → uint128` | view | — |
| `nextId() → uint128` | view | — |
| `claimantOf(uint256 tokenId) → address` | view | — |
| `eligibleStakeAt(uint256 tokenId, uint256 timestamp) → uint256` | view | — |
| `setOracle(address)` | nonpayable | owner |

`disciples` tuple = `(address disciple, uint88 stakeAmount, bool active, uint128 karma, uint64 joinedAt, uint64 exitedAt)`

### Events

```solidity
Entered(address indexed disciple, uint256 indexed tokenId, uint256 amount)
Exited(address indexed disciple, uint256 indexed tokenId)
KarmaGranted(uint256 indexed tokenId, uint256 amount)
FaithCheckedIn(address indexed disciple, uint256 indexed tokenId, uint256 day, uint256 karmaAwarded)
FaithShared(address indexed disciple, uint256 indexed tokenId, uint256 day, string channel, uint256 karmaAwarded)
```

***

## BlessingDistributor

[Contract page →](../contracts/blessing-distributor.md)

### Functions

| Signature | Mutability | Access |
|---|---|---|
| `queueBlessing(uint256 day, uint256 yieldAmount)` | nonpayable | oracle |
| `claim(uint256 roundId, uint256 tokenId)` | nonpayable | original Disciple |
| `pendingBlessing(uint256 roundId, uint256 tokenId) → uint256` | view | — |
| `rounds(uint256) → (uint128,uint128,uint64,uint64)` | view | — |
| `nextRoundId() → uint256` | view | — |
| `seedYield(uint256 amount)` | nonpayable | owner |
| `setOracle(address)` | nonpayable | owner |

`rounds` tuple = `(uint128 yieldPool, uint128 totalFaithSnap, uint64 day, uint64 queuedAt)`

### Events

```solidity
BlessingQueued(uint256 indexed roundId, uint256 day, uint256 yieldPool)
BlessingClaimed(uint256 indexed roundId, uint256 indexed tokenId, address indexed disciple, uint256 amount)
```

***

## CivilizationLog

[Contract page →](../contracts/civilization-log.md)

### Functions

| Signature | Mutability | Access |
|---|---|---|
| `postSnapshot(uint256 day, CivSnapshot snap)` | nonpayable | civEngine |
| `logDivineEvent(DivineEvent ev)` | nonpayable | civEngine |
| `postDemiurgePreview(DemiurgePreview preview)` | nonpayable | civEngine |
| `getSnapshot(uint256 day) → CivSnapshot` | view | — |
| `getDivineEvent(uint256 index) → DivineEvent` | view | — |
| `getDivineEventCount() → uint256` | view | — |
| `getLatestPreview() → DemiurgePreview` | view | — |
| `totalSnapshots() → uint256` | view | — |
| `totalSnapshotCount() → uint256` | view | — |
| `civEngine() → address` | view | — |
| `setCivEngine(address)` | nonpayable | owner |

```solidity
CivSnapshot      = (bytes32 stateHash, uint32 totalEntities, uint32 totalPopulation,
                    uint64 totalFaith, uint8 dominantFaction, uint8 activeRegions, uint64 snapshotAt)
DivineEvent      = (uint8 toolId, uint8 polarity, uint64 executedAt, uint8 targetRegion, uint32 magnitude)
DemiurgePreview  = (uint8[5] toolIds, uint8[5] weights, uint8 forcedPolarity,
                    uint64 decisionAt, uint64 scheduledFor, string prophecyHash)
```

### Events

```solidity
SnapshotPosted(uint256 indexed day, bytes32 stateHash, uint32 totalPopulation, uint64 totalFaith)
DivineEventLogged(uint256 indexed eventId, uint8 toolId, uint8 polarity, uint64 executedAt)
DemiurgePreviewPosted(uint64 scheduledFor, uint8[5] toolIds, uint8 forcedPolarity)
CivEngineUpdated(address indexed newEngine)
```

***

## MockUSDY (ERC-20)

[Contract page →](../contracts/mock-usdy.md)

| Signature | Mutability | Notes |
|---|---|---|
| `faucet()` | nonpayable | Mints 1,000 USDY to caller |
| `mint(address to, uint256 amount)` | nonpayable | Open mint (testnet) |
| `approve(address spender, uint256 amount) → bool` | nonpayable | Standard ERC-20 |
| `allowance(address owner, address spender) → uint256` | view | Standard |
| `balanceOf(address) → uint256` | view | Standard |
| `decimals() → uint8` | pure | Returns **6** |

***

## Enum reference

| Enum | Values |
|---|---|
| `dominantFaction` | `0` believer · `1` apostate · `2` balanced |
| `polarity` | `0` evil · `1` good |
| `forcedPolarity` | `0` force evil · `1` force good · `2` free |
| `targetRegion` | `0–254` region index · `255` all regions |
| `toolId` | `0–4` good tools · `5–9` evil tools (see [Demiurge catalog](../ai-agents/demiurge.md#the-divine-tool-catalog)) |
