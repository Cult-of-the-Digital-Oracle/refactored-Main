# API Reference

Cult of the Digital Oracle has no REST backend. Its "API" is the **five smart contracts** plus a couple of Next.js edge routes. Everything an integrator needs is on-chain.

***

## Surfaces

| Surface | What it is |
|---|---|
| [Smart Contract API](contracts.md) | Every external function and event across the five contracts |
| `GET /api/og/disciple/[tokenId]` | Dynamic OG image (PNG) for a Disciple card — `next/og` edge runtime |
| `POST /api/eth-rpc` | Server-side proxy for Ethereum mainnet reads (avoids public-RPC limits) |

***

## ABIs are the contract

The canonical, typed ABIs live in **`apps/web/src/lib/contracts.ts`** — a single file exporting `CONTRACTS` (addresses from env) and one ABI per contract (`ORACLE_MESSAGE_ABI`, `TEMPLE_VAULT_ABI`, `BLESSING_DISTRIBUTOR_ABI`, `CIVILIZATION_LOG_ABI`, `ERC20_ABI`). If you add a contract function, update it there and the whole frontend sees it.

The [agent](../ai-agents/README.md) declares its own minimal ABIs inline in `agent/src/postToChain.ts` and `civSnapshot.ts` for the functions it writes.

***

## Reading the chain (frontend pattern)

```ts
import { useReadContract } from "wagmi";
import { CONTRACTS, ORACLE_MESSAGE_ABI } from "@/lib/contracts";

const { data: prophecy } = useReadContract({
  address: CONTRACTS.oracleMessage,
  abi: ORACLE_MESSAGE_ABI,
  functionName: "todaysProphecy",
});
```

## Writing to the chain (frontend pattern)

```ts
import { useWriteContract } from "wagmi";
import { CONTRACTS, TEMPLE_VAULT_ABI } from "@/lib/contracts";

const { writeContract } = useWriteContract();
writeContract({
  address: CONTRACTS.templeVault,
  abi: TEMPLE_VAULT_ABI,
  functionName: "enter",
  args: [amount],   // bigint, 6-decimal USDY units
});
```

## Writing from the agent (ethers pattern)

```ts
const c = new ethers.Contract(ORACLE_MESSAGE_ADDRESS, abi, signer);
const tx = await c.postProphecy(text);
await tx.wait();
```

→ Full function & event tables: [Smart Contract API](contracts.md)
