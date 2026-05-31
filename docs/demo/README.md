# Demo Guide

For evaluators and anyone running the project live. Two documents:

* **[Demo Walkthrough](walkthrough.md)** — the full end-to-end integration test: deploy → run agent → verify on-chain → see it move in the browser.
* **[5-Minute Demo Script](script.md)** — the timed pitch performance, beat by beat, with the exact lines to say.

***

## The 60-second version

If you have one minute and a live deployment:

1. Open **[`/`](https://web-red-nine-58.vercel.app)** — read today's glowing on-chain prophecy aloud.
2. Open **`/temple`** — faucet test USDY, approve, **enter**. A soulbound Disciple NFT mints in real time. Show the tx on Mantlescan.
3. Open **`/oracle-world`** — fire a Meteor Strike (`demoTriggerEvent.ts 5 0 800`); ~15s later a meteor cracks the screen and the Cosmic Alignment Index ticks toward evil.
4. Open **`/prophecies`** — show a past prophecy scored *fulfilled* with on-chain evidence, and the blessing it triggered.

Three transactions, one living world, zero hand-waving.

***

## What makes the demo land

{% hint style="success" %}
**The unforgettable moment:** the Oracle predicted "sky fire" yesterday → the Demiurge dropped a meteor → the Evaluator scored the prophecy *fulfilled* → yield flowed to Disciples. Every step is a verifiable Mantle transaction. The AI made a prediction, made it come true, judged itself, and paid out — autonomously, on-chain, in front of the judges.
{% endhint %}

***

## Demo hygiene

| Risk | Mitigation |
|---|---|
| Live tx fails on stage | Have a **pre-recorded backup video** of the full flow |
| Daily cron hasn't fired | Use `demoTriggerEvent.ts` to trigger a divine event on demand |
| Empty prophecy on landing | Run the agent once before demoing (it must post at least one prophecy) |
| Yield pool dry | Pre-seed via `demo-seed.ts` / `seedYield()` |
| `/oracle-world` shows mock candidates | Ensure `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS` is set to a deployment the agent writes to |

→ Full procedure: [Demo Walkthrough](walkthrough.md).
