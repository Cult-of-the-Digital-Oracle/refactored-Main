# Status & Roadmap — Cult of the Digital Oracle

**Updated:** 2026-06-12
**Branch:** `master` (synced with origin, 36 commits, clean tree)
**Hackathon:** Mantle Turing Test 2026 — Consumer & Viral DApps

---

## 1. Executive Summary

Codebase for the full 3-AI "Oracle Civilization" feature is **complete and pushed**.
The remaining work is **deployment + demo packaging**, not feature code. The single
biggest blocker: `CivilizationLog.sol` is not yet on Mantle Sepolia, so the live
`/oracle-world` page falls back to mock data instead of real AI #3 (Demiurge)
decisions. Everything is wired and type-checked locally — it just hasn't been run
against the live chain end-to-end.

---

## 2. What's Done ✅

### Smart contracts (`contracts/`)
- `MockUSDY`, `OracleMessage`, `TempleVault`, `BlessingDistributor` — deployed on Sepolia (live)
- `CivilizationLog.sol` — written, compiles, in `deploy.ts` — **NOT deployed yet**
- 1 integration test: `test/oracle-flow.ts` (161 lines, covers the 4 original contracts)

### AI Agent (`agent/`)
- AI #1 Oracle — daily prophecy generation
- AI #1b Evaluator — fulfillment scoring with civilization snapshot context
- AI #2 Civilization Engine — deterministic world tick + on-chain snapshot
- AI #3 Demiurge — divine-tool selection, posts preview, executes 24h later
- 3 separate OpenRouter LLM key slots (`ORACLE_API_KEY` / `EVALUATOR_API_KEY` / `DEMIURGE_API_KEY`, each falls back to `OPENROUTER_API_KEY`)
- `DEMO_MODE=true` → 30s cron for local dev
- Helper scripts: `scripts/verifyEnv.ts` (pre-flight), `scripts/demoTriggerEvent.ts` (manual divine event)

### Frontend `/oracle-world` (`apps/web/`)
- Asset pipeline: 396 MB / 153 PNG → 230 KB / 4 WebP atlases (smart chroma auto-detects green OR near-black bg)
- Continent simulator: 16384×16384 px, 15K NPC + 5K building cap, SoA TypedArrays, spatial hash
- Faction warfare (hate triangle Human↔Orc↔Elf), boids separation, boats w/ 3-passenger boarding + hard water restriction
- PixiJS v8 renderer: unified depth-sort (2.5D occlusion), viewport culling, LOD tiers, sprite pools
- Disciple-as-NPC hook: each staked wallet → glowing named hero with hover card
- On-chain bridge: polls CivilizationLog every 15s → dispatches new divine events into worker for live visual reaction
- Cinematic VFX: multi-phase meteor (shadow → trail → impact → shockwaves → debris → smoke → shake), blessing sky-beam, plague domes
- Day/night cycle (2-min loop, 9 color stops), weather toggle (rain/snow)
- Empty `sw.js` to silence 404 noise

---

## 3. What's Missing 🚧

### 🔴 Critical — nothing live
1. **Deploy `CivilizationLog`** to Sepolia (only deploy script ready)
2. **End-to-end never run** — Demiurge cron has never fired a real on-chain `DivineEvent`; bridge unproven against live chain
3. **Vercel redeploy** — live site still serves the old build; `/oracle-world` not reachable publicly (no `vercel.json`; relies on git-integration default)

### 🟡 Demo-critical
4. **Demo artifacts** — no video, no pitch deck, no DoraHacks submission
5. **Disciple-NPC needs seeded wallets** — world shows no heroes without staked disciples; need a demo-seed
6. **Onboarding** — new user lands on `/oracle-world` with no explanation of what they're seeing

### 🟢 Risk / polish
7. **CivilizationLog has 0 unit tests**
8. **Dependabot: 8 vulnerabilities** (1 high, 7 moderate) — unreviewed
9. **Mobile untested** — `/oracle-world` is fixed-fullscreen, may break on phones

---

## 4. Deployed Addresses (Sepolia, current)

```
ORACLE_MESSAGE_ADDRESS=0xB983901d66b7aD12305657C172fD84855d78B36F
TEMPLE_VAULT_ADDRESS=0xF83Cd1C5f8Eb2848175Ded767565BBaEC1a8b925
BLESSING_DISTRIBUTOR_ADDRESS=0x750210002b3fA4C1Bbe485ECDd0200D5E03F1Ad3
USDY_ADDRESS=0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500
CIVILIZATION_LOG_ADDRESS=0x4aeFE7Eebbf22B6B9005c08E3dbe89d8Fa90c235  # deployed 2026-06-14, civEngine=oracle EOA
```

---

## 5. Next Steps — Critical Path

### Phase A — Go Live (highest priority)
**Needs from operator:** oracle EOA private key + MNT gas on Sepolia + OpenRouter API key

1. Deploy CivilizationLog
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network mantleSepolia
   # capture printed CivilizationLog address
   ```
2. Update env everywhere
   - `agent/.env` → `CIV_LOG_ADDRESS=<new>`
   - `apps/web/.env.local` → `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS=<new>`
3. Pre-flight + run one agent cycle
   ```bash
   cd agent
   npx tsx scripts/verifyEnv.ts            # all ✓ ?
   CRON_SCHEDULE="" npm run dev            # single cycle → snapshot + preview on chain
   ```
4. Verify on Mantlescan: `logSnapshot`, `logDemiurgePreview` txs succeed; `getLatestPreview` returns non-zero weights
5. Redeploy frontend to Vercel with new env var → confirm `/oracle-world` live, DivineToolsPanel shows real data (not mock)

### Phase B — Demo Readiness
6. Demo-seed disciples (use `contracts/scripts/demo-seed` pattern) so heroes appear in the world
7. Add an onboarding overlay / first-visit tooltip on `/oracle-world`
8. Pre-fire 3-4 divine events on chain (`npx tsx agent/scripts/demoTriggerEvent.ts <toolId>`) so `BalanceIndicator` history is populated
9. Record 3-min demo video + 5-10 slide deck
10. Submit on DoraHacks

### Phase C — Hardening (if time)
11. Hardhat unit tests for `CivilizationLog` (snapshot, preview, divine-event, access control)
12. Review + patch Dependabot vulnerabilities
13. Mobile responsiveness pass on `/oracle-world`

---

## 6. Reference Docs
- `Docs/PROGRESS.md` — full feature log + commands + gotchas
- `INTEGRATION_TEST.md` — step-by-step end-to-end runbook with troubleshooting table
- `agent/.env.example` — 3 LLM key slots + chain config
- `apps/web/.env.example` — NEXT_PUBLIC contract slots
