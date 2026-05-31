# TempleVault

> `contracts/contracts/TempleVault.sol` · `ERC721`, `Ownable`

The Temple. Stake USDY, become a Disciple, receive a **soulbound** NFT (`"Disciple of the Oracle"`, symbol `DISC`). The vault tracks every Disciple's stake, join time, and karma, and exposes the historical-stake view that `BlessingDistributor` needs to split yield fairly.

```solidity
contract TempleVault is ERC721, Ownable
```

***

## The `Disciple` struct

```solidity
struct Disciple {
    address disciple;    // slot 0: bytes  0-19
    uint88  stakeAmount; // slot 0: bytes 20-30   (~309 quintillion USDY @ 6 decimals)
    bool    active;      // slot 0: byte  31
    uint128 karma;       // slot 1: bytes  0-15
    uint64  joinedAt;    // slot 1: bytes 16-23
    uint64  exitedAt;    // slot 1: bytes 24-31
}
```

Two slots, exact-packed. `enter()` writes slot 0 once and slot 1 once. `karma` and `exitedAt` start at their storage defaults (`0`), so a fresh Disciple costs no extra `SSTORE` for them.

***

## State

```solidity
IERC20  public immutable usdy;     // the stake token
address public oracle;             // may grant karma
uint128 public totalFaith;         // sum of all active stake  } packed
uint128 public nextId = 1;         // next tokenId to mint      } one slot

mapping(uint256 => Disciple) public disciples;        // tokenId => Disciple
mapping(address => uint256)  public cardOf;           // wallet  => tokenId (0 = none)
mapping(address => uint256)  public lastCheckInDay;   // wallet  => UTC day
mapping(address => uint256)  public lastShareDay;     // wallet  => UTC day
```

`totalFaith` and `nextId` share one slot, so `enter()` — which reads `nextId` and writes `totalFaith` — touches a single storage slot for both.

{% hint style="warning" %}
**One Disciple per wallet.** `cardOf[msg.sender] != 0` blocks a second `enter()`. To change your stake you must `exit()` (burn) and `enter()` again.
{% endhint %}

***

## Functions

| Function | Access | Purpose | Reverts |
|---|---|---|---|
| `enter(uint256 amount)` → `tokenId` | public | Stake USDY, mint soulbound NFT | `ZeroStake`, `AlreadyDisciple` |
| `exit(uint256 tokenId)` | owner of token | Unstake + burn NFT | `NotDisciple` |
| `checkIn(uint256 tokenId)` | the Disciple | Daily faith action → **+5 karma** | `NotDisciple`, `AlreadyCheckedIn` |
| `recordShare(uint256 tokenId, string channel)` | the Disciple | Share action → **+3 karma** | `NotDisciple`, `AlreadyShared` |
| `grantKarma(uint256 tokenId, uint256 amount)` | `onlyOracle` | Oracle-granted karma | `NotOracle`, `NotDisciple` |
| `cardOf(address)` | view (mapping) | Wallet → tokenId | — |
| `disciples(uint256)` | view (mapping) | Full Disciple record | — |
| `totalFaith()` | view | Total active stake | — |
| `nextId()` | view | Next tokenId | — |
| `claimantOf(uint256 tokenId)` → `address` | view | **Original** owner, survives burn | — |
| `eligibleStakeAt(uint256 tokenId, uint256 timestamp)` → `uint256` | view | Stake active at a past time | — |
| `setOracle(address)` | `onlyOwner` | Rotate oracle | — |

### `enter` — stake to mint

```solidity
function enter(uint256 amount) external returns (uint256 tokenId) {
    if (amount == 0) revert ZeroStake();
    if (cardOf[msg.sender] != 0) revert AlreadyDisciple();
    usdy.safeTransferFrom(msg.sender, address(this), amount);
    unchecked { tokenId = nextId++; }
    _safeMint(msg.sender, tokenId);
    // ... write Disciple struct, set cardOf, add to totalFaith
    emit Entered(msg.sender, tokenId, amount);
}
```

The caller must `approve()` the vault for `amount` USDY first (the frontend does approve → enter as two transactions).

### `checkIn` & `recordShare` — the karma engine

Both are **permissionless faith actions** rate-limited to once per UTC day via `lastCheckInDay` / `lastShareDay`. `checkIn` awards **5 karma**, `recordShare` awards **3 karma** and records the channel string (e.g. `"twitter"`). Karma drives the [leaderboard](../frontend/pages.md) and the Disciple card — it has no bearing on yield, which is purely stake-weighted.

***

## Soulbinding

```solidity
function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    address from = _ownerOf(tokenId);
    if (from != address(0) && to != address(0)) revert Soulbound();
    return super._update(to, tokenId, auth);
}
```

OpenZeppelin v5 routes every mint, transfer, and burn through `_update`. A real transfer has both a non-zero `from` **and** a non-zero `to` — exactly the case this override rejects with `Soulbound()`. Mints (`from == 0`) and burns (`to == 0`) pass through. There is no way to move a Disciple NFT between wallets.

***

## How blessings read this contract

`BlessingDistributor` never trusts the *current* balance — a Disciple could exit between fulfillment and claim. Instead it asks the vault what was true **at the moment the round was queued**:

* **`claimantOf(tokenId)`** returns `disciples[tokenId].disciple` — the original staker address, which is preserved even after the NFT is burned. This is who is allowed to claim.
* **`eligibleStakeAt(tokenId, timestamp)`** returns the stake that was *active* at `timestamp`: zero if the Disciple joined after it, zero if they exited at or before it, otherwise their `stakeAmount`.

This pair is what makes "you only earn blessings for prophecies you were faithful during" enforceable on-chain.

***

## Events

```solidity
event Entered(address indexed disciple, uint256 indexed tokenId, uint256 amount);
event Exited(address indexed disciple, uint256 indexed tokenId);
event KarmaGranted(uint256 indexed tokenId, uint256 amount);
event FaithCheckedIn(address indexed disciple, uint256 indexed tokenId, uint256 day, uint256 karmaAwarded);
event FaithShared(address indexed disciple, uint256 indexed tokenId, uint256 day, string channel, uint256 karmaAwarded);
```

***

## Custom errors

`Soulbound` · `AlreadyDisciple` · `NotDisciple` · `ZeroStake` · `NotOracle` · `AlreadyCheckedIn` · `AlreadyShared`
