# Technology Stack

Every dependency, grouped by workspace, with the reason it's there.

***

## `apps/web/` — frontend

| Tool | Role |
|---|---|
| **Next.js 16** (App Router, Turbopack) | React framework — routes, server components, OG image API |
| **React 19** | UI |
| **Tailwind CSS v4** | Styling — dark mystical theme, pixel aesthetic |
| **TypeScript** | Types across the app; `tsconfig` target **ES2020** (required for BigInt literals in contract calls) |
| **wagmi v2** + **viem** | Typed contract reads/writes, account state |
| **ConnectKit** | Wallet connection modal (MetaMask, WalletConnect) |
| **PixiJS** | WebGL renderer for the `/oracle-world` pixel simulation |
| **Comlink** | Ergonomic Web Worker RPC for the world sim |
| **FastNoiseLite** | OpenSimplex noise for procedural map generation |
| **`next/og`** (Satori) | Dynamic OG images for shareable Disciple cards (edge runtime) |

{% hint style="warning" %}
**This is not the Next.js in your training data.** Next.js 16 has breaking changes; the repo's `apps/web/AGENTS.md` instructs reading `node_modules/next/dist/docs/` before writing frontend code. Heed deprecation notices.
{% endhint %}

### Fonts & aesthetic

* **Press Start 2P** — pixel headings.
* **VT323** — pixel body text.
* A custom **pixel-art asset pack** (oracle, disciples, temple backgrounds, UI chrome) plus WebP sprite **atlases** for the world sim. See [Pixel-Art Asset Pack](../frontend/pixel-art.md).

***

## `contracts/` — smart contracts

| Tool | Role |
|---|---|
| **Solidity 0.8.27** | Contract language; **Cancun** EVM target |
| **Hardhat** | Compile, test, deploy, verify |
| **OpenZeppelin v5** | `ERC721`, `ERC20`, `Ownable`, `SafeERC20` |
| **TypeScript / tsx** | Deploy and demo scripts |

**Compiler settings** (`hardhat.config.ts`): optimizer enabled, **1000 runs**, `evmVersion: cancun`. Networks: `mantleSepolia` (chainId **5003**) and `mantle` (chainId **5000**).

***

## `agent/` — the autonomous AIs

| Tool | Role |
|---|---|
| **Node.js** (24 in CI) + **TypeScript / tsx** | Runtime |
| **ethers v6** | Contract reads/writes from the agent |
| **`openai` SDK** | LLM client — pointed at **OpenRouter**, not OpenAI |
| **OpenRouter** | Model gateway: `google/gemini-2.5-flash` (Oracle, Evaluator), `anthropic/claude-3-5-sonnet` (Demiurge) |
| **node-cron** | Daily scheduling (`0 0 * * *`) |
| **seedrandom** | Deterministic, reproducible Demiurge tool picks |
| **dotenv** | Env loading |

```ts
new OpenAI({
  apiKey: ORACLE_API_KEY || OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: { "HTTP-Referer": "...", "X-Title": "Cult of the Digital Oracle" },
});
```

{% hint style="info" %}
Each agent role has its own key/model env slot (`ORACLE_*`, `EVALUATOR_*`, `DEMIURGE_*`), each falling back to a shared `OPENROUTER_API_KEY` / model default. You can run all three on one key or split them.
{% endhint %}

***

## Network & infrastructure

| Layer | Choice |
|---|---|
| **Chain (demo)** | Mantle Sepolia — chainId `5003`, RPC `https://rpc.sepolia.mantle.xyz`, explorer `https://sepolia.mantlescan.xyz` |
| **Chain (mainnet config)** | Mantle — chainId `5000`, RPC `https://rpc.mantle.xyz`, explorer `https://mantlescan.xyz` |
| **Stake token** | USDY (Mantle RWA stablecoin); `MockUSDY` on testnet |
| **Frontend hosting** | Vercel |
| **Agent hosting** | GitHub Actions cron (`.github/workflows/oracle.yml`) |

***

## Why this stack

* **wagmi + viem + ConnectKit** is the modern, type-safe Web3 frontend baseline — no hand-rolled ABI calls.
* **OpenRouter** gives free/cheap access to multiple model families behind one OpenAI-compatible client, so each agent can use the model that fits its temperament without three SDKs.
* **PixiJS + Web Worker + WebP atlases** is what makes a 15,000-entity world render smoothly in a browser tab during a live demo — the sim runs off the main thread, the renderer only draws.
* **Hardhat + OpenZeppelin** keeps the contracts auditable and standard, while the hand-packed storage layouts (documented per [contract](../contracts/README.md)) keep daily writes cheap on L2.
