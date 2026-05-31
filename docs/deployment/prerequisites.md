# Prerequisites

What you need before deploying anything.

***

## Tooling

| Requirement | Notes |
|---|---|
| **Node.js 20+** / npm 10+ | The CI uses Node 24; 20+ works locally |
| **Git** | To clone the repo |
| A terminal on macOS/Linux/Windows | Commands below are shell-style |

```bash
git clone https://github.com/Cult-of-the-Digital-Oracle/refactored-Main.git
cd refactored-Main
```

Each workspace installs independently:

```bash
cd contracts && npm install
cd ../agent   && npm install
cd ../apps/web && npm install
```

***

## A funded Mantle Sepolia wallet

You need an EOA with **≥ 0.1 MNT** on Mantle Sepolia to pay gas for deployment and the daily agent writes.

| Setting | Value |
|---|---|
| Network | Mantle Sepolia |
| Chain ID | `5003` |
| RPC | `https://rpc.sepolia.mantle.xyz` |
| Explorer | `https://sepolia.mantlescan.xyz` |
| Faucet | Mantle Sepolia faucet (get test MNT) |

Export this wallet's private key — it becomes the **oracle EOA** (and, by default, the civ-engine EOA). Keep it in `.env` files only; never commit it.

{% hint style="danger" %}
The oracle private key can post prophecies and snapshots on your deployment. Treat it as a secret. It **cannot** drain the vault or redirect blessings (those are pro-rata math), but a leaked key means an attacker can spam fake prophecies. Use a dedicated demo wallet, not your main one.
{% endhint %}

***

## An OpenRouter API key

The three AI agents call models through **OpenRouter** (not OpenAI or Groq directly).

1. Create a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. You can use **one key for all three agents** (`OPENROUTER_API_KEY`) or **separate keys per role** (`ORACLE_API_KEY`, `EVALUATOR_API_KEY`, `DEMIURGE_API_KEY`).
3. Default models — `google/gemini-2.5-flash` (Oracle, Evaluator) and `anthropic/claude-3-5-sonnet` (Demiurge) — must be available to your account.

***

## Checklist

* [ ] Node 20+ installed
* [ ] Repo cloned, deps installed in all three workspaces
* [ ] Mantle Sepolia wallet funded with ≥ 0.1 MNT
* [ ] Private key exported (kept secret)
* [ ] OpenRouter key(s) ready

→ Next: [Deploy Contracts](contracts.md).
