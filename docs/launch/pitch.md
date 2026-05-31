# Pitch & Judge Q&A

The hard questions, answered honestly. If you can field these, the demo sells itself.

***

## "Is this just gambling?"

**No.** Disciples stake USDY and receive yield from a pool — structurally a yield product, not a wager. There's no betting *against* anyone, no house edge, no loss of principal: `exit()` returns your full stake anytime. The prophecy is a **narrative layer** on top of a legitimate stake-and-yield mechanic. Users earn for participating, not for guessing.

***

## "How is the yield sustainable?"

For the hackathon, the blessing pool is **pre-seeded** (`seedYield()` / `demo-seed.ts`). The real model: USDY is itself a **yield-bearing RWA**, and the Temple's idle USDY could be deployed into Mantle lending/yield protocols, distributing the native yield to Disciples. The contract is agnostic to the yield source — `queueBlessing` just needs funded USDY.

***

## "What's actually Mantle-specific here?"

Three things, all load-bearing:

1. **USDY** — Disciples stake Mantle's native real-world-asset stablecoin, not a synthetic.
2. **Soulbound identity** — Disciples are non-transferable ERC-721s, identity over speculation.
3. **On-chain AI memory** — every prophecy, verdict, and divine act is a permanent Mantle transaction, making the chain an auditable AI benchmark. On a cheap, fast L2, three agents writing daily stays economical.

***

## "It's three AIs — but is the AI doing anything real, or is it window dressing?"

Real, and the architecture proves it:

* The **[Evaluator](../ai-agents/evaluator.md)** scores prophecies with a *separate* cold-temperature model where the LLM owns only **50%** of the score — the rest is deterministic on-chain data. The AI literally cannot declare victory alone.
* The **[Demiurge](../ai-agents/demiurge.md)** parses prophecy sentiment with an LLM, then picks tools via a **seeded, reproducible** algorithm kept 50/50 good/evil. Whimsical, but auditable.
* All three agents have **separate on-chain authority** — none can both predict and pay itself.

It's the opposite of a chatbot in a Web3 skin: the AI's decisions have on-chain consequences and on-chain accountability.

***

## "What stops the operator from faking results or paying friends?"

| Attack | Why it fails |
|---|---|
| Fake a fulfillment | Score is 50% deterministic on-chain data; the `evidence` string is stored publicly |
| Pay specific wallets | Blessings are **pro-rata math** over staked faith at queue time — the oracle sets the amount, never the recipients |
| Rewrite a bad prophecy | Prophecies are immutable the instant they're mined |
| Drain the vault | The oracle key can't move staked USDY; `exit()` and `claim()` are user-controlled |

Compromising the oracle key lets an attacker post fake *prophecies* — embarrassing, but it can't touch user funds.

***

## "Why would anyone actually use this?"

The same reason people follow crypto influencers and read TA threads: **narrative + yield.** The Oracle is a gamified, screenshot-worthy way to engage with on-chain data — and you earn while you play, with a soulbound identity and a leaderboard to flex. The god-simulator turns passive yield into a spectacle worth watching daily.

***

## "What's not finished?"

Be upfront — it reads as credibility:

* The `/oracle-world` **prophecy overlay is currently hardcoded**; the live prophecy is on `/` and `/prophecies`. Wiring the overlay to `OracleMessage` is a small follow-up.
* The CI workflow still references a `GROQ_API_KEY` and omits `CIV_LOG_ADDRESS` (the code uses OpenRouter); the agent runs correctly when run with the right env locally or on a proper host.
* Contract addresses across the repo's docs aren't fully reconciled into one published set — [Deployment & Addresses](../contracts/deployment.md) flags this.

None of these affect the core demo: prophecy → stake → divine event → fulfillment → yield, all live on-chain.

***

## The closing line

> *"The Turing Test asks if you can tell a machine from a human. We built an AI that doesn't hide — and got people to stake real value on its word anyway. The question was never 'is it a machine?' It's 'do you believe it?' — and the chain has the receipts."*

→ [Virality Plan](virality.md) · [5-Minute Demo Script](../demo/script.md)
