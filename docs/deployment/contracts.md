# Deploy Contracts

Deploy all five contracts to Mantle Sepolia and capture their addresses.

> Reference for the addresses themselves: [Deployment & Addresses](../contracts/deployment.md).

***

## 1. Configure

```bash
cd contracts
cp .env.example .env
```

Fill `contracts/.env`:

```env
PRIVATE_KEY=<deployer / oracle private key>
ORACLE_ADDRESS=<the EOA that will post prophecies>     # usually the deployer
# optional: a separate civ-engine address for CivilizationLog
```

***

## 2. Compile

```bash
npx hardhat compile
```

A clean compile against Solidity 0.8.27 / Cancun confirms your toolchain is right.

***

## 3. Deploy

```bash
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

The script deploys in dependency order and prints **five addresses**:

```
MockUSDY            0x…
OracleMessage       0x…
TempleVault         0x…
BlessingDistributor 0x…
CivilizationLog     0x…
```

{% hint style="danger" %}
**Copy all five immediately.** There is no `deployments/*.json` artifact — if you lose this console output you have to re-deploy. Paste them straight into both `agent/.env` and `apps/web/.env.local`.
{% endhint %}

***

## 4. Verify on Mantlescan (optional but recommended)

```bash
npx hardhat verify --network mantleSepolia <address> <constructor args…>
```

Verified source makes the contracts inspectable on `sepolia.mantlescan.xyz` — a strong signal for judges who want to read the on-chain logic.

***

## 5. Seed demo state (optional)

For a richer demo, pre-fund a blessing pool and populate disciples:

```bash
# seed a 50 USDY blessing round
npx hardhat run scripts/demo-seed.ts --network mantleSepolia

# send 0.2 MNT gas to a test wallet
npx tsx scripts/topup.ts <wallet-address>
```

(See the repo's `README.md` "Demo helpers" for the full list.)

***

## Where the addresses go next

| File | Keys |
|---|---|
| `agent/.env` | `ORACLE_MESSAGE_ADDRESS`, `TEMPLE_VAULT_ADDRESS`, `BLESSING_DISTRIBUTOR_ADDRESS`, `USDY_ADDRESS`, `CIV_LOG_ADDRESS` |
| `apps/web/.env.local` | the same five, prefixed `NEXT_PUBLIC_…` |

→ Next: [Run the Agent](agent.md) · [Deploy the Frontend](frontend.md).
