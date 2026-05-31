# AI #2 — The Evaluator

> `agent/src/evaluateProphecy.ts` · default model `google/gemini-2.5-flash` · `temperature 0.15`

The judge. Each day, before the Oracle speaks again, the Evaluator scores **yesterday's** prophecy against what actually happened — to the chain, to the Temple, and to the simulated civilization. It writes a verdict (0–100, with a reason and an evidence snapshot) to [`OracleMessage`](../contracts/oracle-message.md), and if the score clears the threshold it queues a [blessing](../contracts/blessing-distributor.md).

{% hint style="success" %}
**The Evaluator is what stops the project being theatre.** The prophecy is graded by a *different* model with a *cold* temperature — and the LLM only owns half the score. The other half is hard on-chain data the AI cannot fake.
{% endhint %}

***

## The hybrid score

This is the most important formula in the system. The final score is a weighted blend, every term clamped to 0–100:

$$
\text{score} = \text{round}\big(\,0.50\cdot S_{\text{semantic}} + 0.20\cdot S_{\text{signal}} + 0.10\cdot B_{\text{temple}} + 0.20\cdot B_{\text{civ}}\,\big)
$$

| Term | Weight | Source |
|---|---|---|
| `semanticScore` | **50%** | The LLM's judgment of whether the words matched reality |
| `signalScore` | **20%** | Deterministic Mantle on-chain activity |
| `templeBonus` | **10%** | Deterministic Temple growth/exodus |
| `civBonus` | **20%** | Deterministic civilization deltas vs prophecy keywords |

So even a maximally generous LLM can contribute at most 50 points. To reach a fulfilled verdict (≥ 70), the **chain and the simulation have to corroborate the prophecy.** That is the integrity guarantee.

### `signalScore` — did the chain move?

`baselineSignalScore()` starts at **25** and adds, capped:

* `+min(25, estTx24h / 1000)`
* `+min(15, activeAddresses / 5)`
* `+min(15, contractCallRatio / 5)`
* `+min(10, largeValueTransfers × 2)`
* `+min(10, usdyTransferCount)`

### `templeBonus` — did the cult grow?

`templeActivityBonus()` rewards faith in motion:

* `+min(40, netGrowth24h × 15)` when growth is positive
* `+min(30, (newDisciples + exitedDisciples) × 10)` — any churn is engagement
* `+min(30, round(totalFaith / 10))`

### `civBonus` — did the world bend to the words?

Starting from a neutral **50**, the Evaluator matches **population and faith deltas** against the prophecy's language:

| Condition | Prophecy contains… | Effect |
|---|---|---|
| population rose | `grow, rise, multiply, new` | **+20** |
| population fell > 5 | `meteor, plague, die, doom, ash, strike` | **+25** |
| faith rose > 10 | `devotion, belief, faith, glory` | **+20** |
| faith fell < −10 | `void, doubt, apostasy, collapse` | **+20** |

A prophecy that foretold "sky fire" the day before a [Meteor Strike](demiurge.md) cratered a region scores *high* — because the [Demiurge](demiurge.md) actually fired that meteor. The three agents conspire to make prophecies come true, and the Evaluator rewards it when they do.

***

## The persona

The system prompt (`EVAL_SYSTEM`) is the opposite of the Oracle's:

> *"You are a strict fulfillment judge for an on-chain oracle…"*

It is given the prophecy text, the chain snapshot, and yesterday's + today's civilization snapshots, and must return **only**:

```json
{ "score": 0-100, "reason": "<one sentence>" }
```

| Parameter | Value |
|---|---|
| `max_tokens` | `120` |
| `temperature` | `0.15` (cold, repeatable) |

The response is stripped of any ```` ```json ```` fences and parsed. **If parsing fails, the LLM term falls back to the deterministic `baselineSignalScore`** — a malformed model reply degrades gracefully to on-chain truth rather than crashing the cycle.

***

## What gets written

`evaluateProphecy` returns `{ score, reason, evidence }`:

* **`score`** — the blended 0–100 value.
* **`reason`** — the LLM's one-sentence justification (sliced to 240 chars).
* **`evidence`** — a semicolon-joined audit string capturing exactly what the verdict saw: `hybrid=…; model=…; baseline=…; templeBonus=…; civBonus=…; disciples=…; faith=…; new24h=…; exited24h=…; tx24h=…; usdy=…`.

That `evidence` string is stored on-chain in `resolveProphecy`, so anyone can audit *why* a prophecy was scored the way it was — not just the number.

***

## The blessing trigger

Back in `runOracleCycle`, after resolving:

```ts
if (score >= threshold && BLESSING_DISTRIBUTOR_ADDRESS && USDY_ADDRESS) {
    await queueBlessing(signer, USDY_ADDRESS, BLESSING_DISTRIBUTOR_ADDRESS, yesterday.day, YIELD_PER_ROUND);
}
```

* `threshold` = `FULFILLMENT_THRESHOLD` env, **default 70**.
* `YIELD_PER_ROUND` = **0.5 USDY** (`500_000` units at 6 decimals).

A fulfilled prophecy opens a blessing round; the faithful claim their pro-rata share. See [BlessingDistributor](../contracts/blessing-distributor.md).

***

## Why this is the credible core

Strip everything else away and the Evaluator is the project's honesty mechanism: an independent cold-temperature judge, a deterministic majority of the score, an on-chain evidence trail, and a payout that only fires when the *chain itself* agrees the prophecy came true. The AI has skin in the game — and the game is refereed by math, not vibes.
