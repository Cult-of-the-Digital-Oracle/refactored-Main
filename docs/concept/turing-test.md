# The Turing Test Angle

This was built for the **Mantle Turing Test Hackathon 2026**. But it doesn't ask the Turing question the way you'd expect — and that's the point.

***

## The classic test, and why we flip it

The Turing Test asks: *can you tell a machine from a human?* It is a test of **disguise** — the machine wins by being indistinguishable.

Cult of the Digital Oracle asks a different, harder question:

> Not *"is this an AI?"* — everyone knows it's an AI. The question is **"do you believe it anyway?"**

The Oracle never pretends to be human. It is openly, proudly a machine prophet. The test is whether an autonomous AI can be *compelling and credible enough that people stake real value on its words.* That's a test of **trust**, not disguise — and it's a far more interesting bar for an on-chain AI to clear.

***

## An immutable benchmark of AI behavior

Here's the part that fits the hackathon's deeper intent. Every decision the AI makes is a permanent Mantle transaction:

* every **prophecy** (`postProphecy`)
* every **verdict on its own prophecy**, with evidence (`resolveProphecy`)
* every **divine intervention** (`logDivineEvent`)
* every **declared intention** before acting (`postDemiurgePreview`)

That means the chain accumulates an **unforgeable, auditable track record of an autonomous agent's performance over time.** You can replay the Oracle's entire history and compute, prophecy by prophecy, how often reality and its own cult proved it right. The AI cannot retcon a failed prediction; it cannot quietly delete a bad call.

{% hint style="success" %}
A Turing-test benchmark needs three things: the AI's claims, the ground truth, and an immutable record linking them. This project puts **all three on-chain** — the prophecy is the claim, the chain + simulation are the ground truth, and `OracleMessage` + `CivilizationLog` are the tamper-proof link. The benchmark *is* the product.
{% endhint %}

***

## Honesty by construction

What stops it being a magic trick? The architecture, not a promise:

| Risk | Structural defense |
|---|---|
| AI grades its own homework | A **separate** model judges (`temperature 0.15`), and the LLM owns only **50%** of the score — the rest is on-chain data ([Evaluator](../ai-agents/evaluator.md)) |
| AI picks favorable outcomes | The Demiurge's tool choice is a **seeded, reproducible** PRNG over LLM-weighted candidates, kept 50/50 good/evil ([Demiurge](../ai-agents/demiurge.md)) |
| Operator fakes results | Prophecy, verdict, evidence, and world hash are all **immutable** the moment they're mined |
| Operator drains the prize | Blessings are **pro-rata math** over staked faith — the oracle sets the amount, never the recipients ([BlessingDistributor](../contracts/blessing-distributor.md)) |

***

## Why this belongs in Consumer & Viral DApps

The submission track is Consumer & Viral — and the Turing framing is also the viral hook:

* **A shareable identity.** *"I am Disciple #7 of the Cult of the Digital Oracle 🔮"* — a soulbound card with a dynamic OG image.
* **A screenshot-worthy artifact.** A glowing, eerie daily prophecy that begs to be posted with *"an AI just predicted this on-chain — and it came true."*
* **A spectacle.** A living pixel world where a god-AI drops meteors you can watch in your browser.
* **A stake.** Real (test) USDY, real yield, real karma — engagement with skin in it.

The Turing Test made consumer-legible: not a lab question, but a cult you can join, screenshot, and earn from.

→ Back to [The Belief Economy](README.md) · or see the [Demo Walkthrough](../demo/README.md)
