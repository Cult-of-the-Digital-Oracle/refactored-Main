# Virality Plan

This is a **Consumer & Viral DApps** submission. Virality isn't an afterthought — it's wired into the product.

***

## The shareable surfaces

| Surface | The share |
|---|---|
| **Disciple card** (`/disciple/[tokenId]`) | *"I am Disciple #7 of the Cult of the Digital Oracle 🔮"* — a soulbound identity with a dynamic OG image |
| **Today's prophecy** (`/`) | A glowing, eerie omen that begs a screenshot: *"an AI just predicted this on-chain"* |
| **Fulfilled prophecy** (`/prophecies/[day]`) | *"It said the sky would fall. Last night a meteor hit. Scored 84/100. On-chain."* |
| **Leaderboard** (`/leaderboard`) | A flex: rank, faith, karma, mystical name |
| **The god-game** (`/oracle-world`) | A watchable pixel world where a meteor falls — inherently clippable |

***

## The OG-image engine

The growth loop runs on **dynamic Open Graph images**. `/api/og/disciple/[tokenId]` (a `next/og` edge route) renders a pixel-art card — name, stake, karma, and join date — on the fly. When a Disciple shares their link, X/Twitter, Discord, and Telegram unfurl it into a rich card automatically. No design work per share; every Disciple is a billboard.

The on-chain `recordShare(tokenId, channel)` action rewards sharing with **+3 karma (once per UTC day)** — so spreading the cult is itself a gameplay loop that climbs the leaderboard.

***

## Built-in screenshot bait

The aesthetic *is* the marketing. Three things are designed to be captured and posted:

1. **The Oracle speaking** — a hooded AI with a glowing circuit face, an eerie one-line prophecy, dark gold pixel chrome.
2. **A meteor strike in `/oracle-world`** — a god-AI cratering a pixel civilization, live.
3. **A soulbound Disciple card** — collectible identity with a deterministic mystical name.

Dark, mystical, pixel-art visuals are disproportionately screenshot-worthy — that's the entire point of the [art direction](../frontend/pixel-art.md).

***

## Launch sequence

| Beat | Action |
|---|---|
| **Tease** | Post the Oracle's first prophecy as a screenshot: *"An AI just delivered its first prophecy on Mantle. It read the blockchain and spoke. Here's what it said 👇"* |
| **Open the Temple** | Drop the link; first Disciples mint and share their cards (karma reward) |
| **First fulfillment** | When a prophecy fulfills, auto-shareable card: *"The Oracle was right. Blessings flowed."* |
| **The god-game clip** | Post a meteor-strike clip from `/oracle-world` — the spectacle hook |
| **Leaderboard flex** | Early Disciples flex low token IDs (*"Disciple #3"*) — scarcity + status |

***

## Why the loop compounds

```mermaid
graph LR
    J[Join · mint Disciple] --> S[Share card · +karma]
    S --> V[OG image unfurls<br/>on social]
    V --> N[New visitor reads prophecy]
    N --> J
```

Every share is a karma-earning game action *and* a recruitment ad. The cult grows because growing it is fun, status-bearing, and on-chain rewarded — the prophecy of "the faithful shall multiply" becomes self-fulfilling once again.

→ [Pitch & Judge Q&A](pitch.md) · [The Belief Economy](../concept/README.md)
