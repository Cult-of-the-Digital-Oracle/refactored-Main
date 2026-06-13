# Cult of the Digital Oracle — Progress Tracker

**Project**: Mantle Turing Test Hackathon 2026 — Consumer & Viral DApps Track
**Tech**: Next.js 16 + React 19 + Tailwind v4 + wagmi v2 + viem + ConnectKit + PixiJS v8 + bitECS-style SoA + Solidity 0.8.27 + Node.js agent + OpenRouter LLMs
**Network**: Mantle Sepolia (chainId 5003)
**Live (legacy build)**: https://web-red-nine-58.vercel.app
**Hackathon**: https://dorahacks.io/hackathon/mantleturingtesthackathon2026

---

## Concept

3 autonomous AI agents driving an on-chain belief economy + visual simulation:

- **AI #1 Oracle** — reads Mantle chain daily, writes a cryptic prophecy on-chain, later scores its own fulfillment.
- **AI #2 Civilization Engine** — pure deterministic simulator of a 1024×1024 NPC continent; posts daily state snapshot to chain.
- **AI #3 Demiurge** — reads today's prophecy, picks a divine tool (top-5 weighted), 24h later executes the chosen tool which posts a `DivineEvent` to chain.

User flow: stake USDY in Temple → mint soulbound Disciple NFT → watch oracle world unfold on `/oracle-world` → claim blessing yield when prophecies fulfill.

---

## ✅ Done (this overhaul)

### Phase 1 — Asset pipeline
- Wrote `apps/web/scripts/build-atlas.mjs` (sharp + chroma-crop + WebP atlas pack)
- Compressed **153 PNG / 396 MB** of pixel art → **4 atlases / ~230 KB** total
  - `units.webp` (42 NPCs/fauna) · `buildings.webp` (70 structures) · `env.webp` (trees/biomes/props) · `vfx.webp` (8 effects)
- Auto-generates `manifest.json` with per-frame coordinates
- Output committed to `apps/web/public/oracle-world/`

### Phase 2 — Simulation worker (`apps/web/src/lib/simulation/`)
- Rewrote `worker.ts` with SoA TypedArrays (zero-GC) + spatial hash 256×256
- `mapGen.ts` — FastNoiseLite multi-octave + radial continent falloff, 1024² tiles, 16384×16384 px world
- Faction hate matrix (Human↔Orc, Orc↔Elf), boids separation, attack range 25 px
- 15 K max NPCs + 5 K max buildings + 300 max boats
- Spawn cooldowns tuned 20× slower than baseline so the continent doesn't saturate in minutes
- Boats are dynamic entities (not static decorations) — target-based navigation, axis-separated coastline slide, 3-passenger slots, board/disembark cycle
- HARD water restriction — sentient creatures + land fauna can never end a tick on a water tile (revert-on-entry + nearest-walkable rescue)
- Comlink API preserved: `initialize / startLoop / stopLoop / triggerDivineTool / consumeVisualEvents / getBiomeGrid / getTreesAndGrass`
- Per-tick `RENDER_FRAME` raw `postMessage` with transferable buffers (bypass Comlink JSON marshalling)

### Phase 3 — WorldCanvas renderer (`apps/web/src/components/OracleWorld/WorldCanvas.tsx`)
- PixiJS v8 application, race-condition gated (`appReady` state) so map bakes reliably regardless of atlas load timing
- **Unified depth-sorted layer** — trees, grass, props, buildings, NPCs all share one `sortableChildren` container, zIndex = feet Y → proper 2.5D occlusion (an NPC behind a castle wall gets hidden, not standing on the roof)
- Viewport culling + LOD tiers (zoom < 0.3 = boost sprite scale to stay visible)
- Sprite pools for units/buildings/boats — no allocation per frame
- Real-world proportion audit:
  ```
  great_hall  1.40   > castle 1.05   > tower 0.88
   > tree 0.85       > hut 0.58      > wall 0.65
   > NPC 0.32        > campfire 0.22 > grass 0.18
  ```
- Procedural animations: idle breathing, human walk-bob, orc limp, elf glide, attack rotation flash, building grow-from-ground, boat bobbing, water shimmer ripples
- VFX: meteor sprite + screen shake + sprite-based explosion debris, projectile sprites spawned per ranged attacker (archer/mage/ranger/etc), blessing/plague/flash circles
- Biome tile overlay — at zoom ≥ 1.5 overlays detailed biome textures over base color map (viewport-culled, pooled, max 1500 visible)
- Wave shimmer particles on shallow/deep sea in viewport

### Phase 5 — Disciple-as-NPC viral hook
- `apps/web/src/lib/disciples.ts` — fetches all active Disciples from TempleVault, derives deterministic world position (hash addr + retry until walkable biome), race tilt (55% believer / 25% wanderer / 20% apostate), subType
- HERO sprite in WorldCanvas: glow pulse, scale 1.6× over base NPC, name label (Press Start 2P, gold) visible at zoom ≥ 0.7
- Page polls `nextId()` + `disciples(i)` every 30 s — newly-staked wallets show up live
- Hover within ~40 world-px → floating gold info card: mystical name, token #, truncated wallet, faith staked, karma, faction
- Reuses existing `generateDiscipleName()` from `discipleName.ts`

### Phase 6 — Living world polish
- Smart chroma key — corner-sample auto-detects bg colour (green chroma OR near-black VFX backdrop); rebuilt atlases
- Cinematic meteor: warning shadow + pulsing ring → tilted descent with fire trail → bright impact flash + 3-tier shockwave rings → layered debris + smoke column + screen flash + eased camera shake
- Cinematic blessing: golden sky-beam descent + cross-shaped sparkle stars + ground halo
- Cinematic plague: 3 nested expanding domes + rising bone-grey wisps
- Layered explosion with upward bias, gravity, rotation
- `flashScreen()` full-screen overlay punctuation, `triggerScreenShake()` cubic ease-out
- Day/night cycle — 2-min loop, 9 colour stops (midnight indigo → dawn pink → noon clear → dusk amber → twilight purple)
- Weather toggle button in HUD — cycles clear → rain → snow; rain falls fast with slant, snow drifts slowly with sway

### Phase 4 — On-chain integration
- 5 contracts wired: `OracleMessage`, `TempleVault`, `BlessingDistributor`, `MockUSDY`, `CivilizationLog`
- Agent `index.ts` orchestrates daily cycle: evaluate yesterday → tick civ → post snapshot → fetch chain → post today's prophecy → demiurge decide & post preview → demiurge.checkAndExecute (24h-old preview executes)
- 3 LLM slots in agent: `ORACLE_API_KEY / EVALUATOR_API_KEY / DEMIURGE_API_KEY` (each falls back to `OPENROUTER_API_KEY`)
- **Bridge** (`apps/web/src/app/oracle-world/page.tsx`): polls CivilizationLog every 15 s, when `getDivineEventCount` increases, dispatches new events into the worker via `triggerDivineTool` → simulator visually reacts to on-chain AI #3 decisions
- `DEMO_MODE=true` flag → cron compressed to 30 s for local dev
- `agent/scripts/demoTriggerEvent.ts <toolId>` — manual divine event firing for live demos
- `agent/scripts/verifyEnv.ts` — pre-flight env validator (RPC reachable, balance, contract deployed)
- `apps/web/.env.example` + `INTEGRATION_TEST.md` runbook

---

## 🚧 Pending / next phases

### A. Deploy + Demo Prep — **highest impact for hackathon**
- [ ] Re-deploy contracts to Mantle Sepolia, capture new addresses
- [ ] Fill `agent/.env` with addresses + OpenRouter keys, run `verifyEnv.ts`
- [ ] Run `npm run dev` agent in single-run mode, watch first cycle finish on-chain
- [ ] Update Vercel env vars + redeploy `apps/web`
- [ ] Schedule the daily cron to actually run (Railway / Fly.io / self-hosted)
- [ ] Pre-record 3-4 days of Demiurge events on-chain (so judges see populated `BalanceIndicator` history)
- [ ] Write 5-min demo script + record video
- [ ] Polish landing page (LCP warnings — add `loading="eager"` to hero images)

### B. Disciple-as-NPC viral hook — **strong differentiator**
- [ ] When a wallet stakes via Temple, read all Disciple NFTs in worker
- [ ] Spawn one HERO entity per Disciple wallet, name = on-chain mystical name (already generated by `discipleName.ts`)
- [ ] Hero placement = derived from wallet address (deterministic position seed)
- [ ] Hero faction tint based on prophecy alignment history
- [ ] `/disciple/[id]` page links to "see your hero in the world" — pans the camera in `/oracle-world`
- [ ] Shareable screenshot moment: "Ashen Keeper of the Chain in The Oracle Civilization"

### C. Living world polish
- [ ] Day/night cycle — global tint on PIXI stage shifting sun position
- [ ] Weather toggle UI (rain/snow VFX assets already in atlas, just unused — `raindrop_particle`, `snowflake_particle`)
- [ ] Region-vs-region war animations when two settlements clash
- [ ] Mini-map overlay in a corner showing whole continent + camera frustum
- [ ] Replay-mode: rewind to a past day's snapshot from CivilizationLog and re-simulate

### D. Smart contract / testing
- [ ] Hardhat unit tests for each contract (currently only deploy + demo seed scripts)
- [ ] Fuzz test prophecy resolution edge cases
- [ ] Slither / static analysis pass

### E. Submission prep
- [ ] DoraHacks submission form
- [ ] Pitch deck (5-10 slides)
- [ ] Demo video (3 min)
- [ ] README polish — add screenshots + GIFs of /oracle-world

---

## 🗂️ File structure (key paths)

```
Cult-of-the-Digital-Oracle/
├── refactored-Main/
│   ├── apps/web/                         # Next.js frontend
│   │   ├── scripts/build-atlas.mjs       # asset pipeline (sharp)
│   │   ├── scripts/test-oracle-world.py  # Playwright smoke test
│   │   ├── scripts/fps-check.py          # perf probe
│   │   ├── public/oracle-world/          # generated atlases + manifest
│   │   ├── src/lib/simulation/
│   │   │   ├── types.ts                  # FactionType, RaceId, BIOME, WORLD_TILES, …
│   │   │   ├── worker.ts                 # main thread simulation worker (SoA)
│   │   │   ├── mapGen.ts                 # FastNoiseLite continent generator
│   │   │   ├── atlas-loader.ts           # PIXI texture loader + scale tables
│   │   │   └── divineTools.ts            # 10-tool catalog (shared w/ HUD)
│   │   ├── src/components/OracleWorld/   # ProphecyOverlay, EventLog, DivineToolsPanel, …
│   │   │   └── WorldCanvas.tsx           # PixiJS renderer (~600 lines)
│   │   ├── src/app/oracle-world/page.tsx # page layout + on-chain polling bridge
│   │   └── .env.example                  # client env template
│   ├── agent/                            # Node cron orchestrator
│   │   ├── scripts/
│   │   │   ├── verifyEnv.ts              # pre-flight check
│   │   │   └── demoTriggerEvent.ts       # manual divine event for live demos
│   │   ├── src/
│   │   │   ├── index.ts                  # orchestrator + cron + 3 OpenAI clients
│   │   │   ├── generateProphecy.ts       # AI #1 generation
│   │   │   ├── evaluateProphecy.ts       # AI #1b fulfillment scoring
│   │   │   ├── postToChain.ts            # ethers contract writes
│   │   │   ├── civilization/             # AI #2 (engine, snapshot, growth)
│   │   │   └── demiurge/                 # AI #3 (agent, prophecyParser, toolSelector)
│   │   └── .env.example                  # 3 LLM key slots + chain config
│   ├── contracts/                        # Hardhat project
│   │   ├── contracts/
│   │   │   ├── OracleMessage.sol
│   │   │   ├── TempleVault.sol
│   │   │   ├── BlessingDistributor.sol
│   │   │   ├── MockUSDY.sol
│   │   │   └── CivilizationLog.sol
│   │   └── scripts/deploy.ts             # deploys all 5
│   ├── PROJECT.md                        # pitch + technical overview
│   ├── README.md                         # quick start
│   ├── CLAUDE.md                         # repo-specific coding notes
│   └── INTEGRATION_TEST.md               # end-to-end runbook
├── PixelArtAssets/Pixel Art Assets/      # 153 source PNGs (gitignored / large)
├── Resources/                            # open-source libs reference + WorldBox spec
├── Docs/
│   └── PROGRESS.md                       # ← this file
└── AgentSessions/                        # Antigravity CLI conversation exports
```

---

## 🔧 Common commands

```bash
# Asset pipeline (re-run if you swap PixelArtAssets)
cd apps/web && node scripts/build-atlas.mjs

# Frontend dev
cd apps/web && npm install && npm run dev          # :3000

# Smoke test the simulator in headless Chromium
cd apps/web && python scripts/test-oracle-world.py # writes screenshots

# Type-check (no emit, fast)
cd apps/web && npx tsc --noEmit
cd agent && npx tsc --noEmit

# Agent — single-run end-to-end cycle
cd agent && CRON_SCHEDULE="" npm run dev

# Agent — local dev with 30 s cron
cd agent && DEMO_MODE=true npm run dev

# Verify env before running agent
cd agent && npx tsx scripts/verifyEnv.ts

# Manually trigger a divine event (judges demo)
cd agent && npx tsx scripts/demoTriggerEvent.ts 5 0 800   # meteor at region 0

# Contracts — compile + deploy to Sepolia
cd contracts && npx hardhat compile
cd contracts && npx hardhat run scripts/deploy.ts --network mantleSepolia

# Demo data
cd contracts && npx hardhat run scripts/demo-seed.ts --network mantleSepolia
```

---

## 🎯 Key constraints & gotchas

- `apps/web/tsconfig.json` MUST stay at `"target": "ES2020"` — BigInt literals in contract reads require it
- Worker self-postMessage uses `(self as unknown as Worker).postMessage(...)` cast because TS resolves `self` to `Window` in this lib config
- PIXI v8 changed `app.view` → `app.canvas`, `Graphics.beginFill()` → `.fill({color})`, `Texture.from(canvas)` still works
- Day index is `Math.floor(block.timestamp / 1 days)` in Solidity — `DEMO_MODE` can't compress this without a hardhat fork
- `TempleVault` NFTs are soulbound — never attempt transfer logic
- `MAX_TEXTURE_SIZE` on WebGL caps the baked map; we use a 1024×1024 ImageData scaled 16× (one sprite) instead of 16384² render texture

---

## 📞 LLM key strategy

Three independent slots in `agent/.env`:

```
ORACLE_API_KEY     # AI #1 prophecy generation
EVALUATOR_API_KEY  # AI #1b fulfillment scoring
DEMIURGE_API_KEY   # AI #3 tool selection
OPENROUTER_API_KEY # fallback for any blank slot
```

Models defaulted: `google/gemini-2.5-flash` (oracle + evaluator), `anthropic/claude-3-5-sonnet` (demiurge). All routed via OpenRouter (`https://openrouter.ai/api/v1`).

---

## 📓 Session log (high-level)

| Date | Focus |
|---|---|
| 2026-05-21 | Antigravity CLI sessions: initial 3-AI scaffold (contracts, agent, frontend layout, atlas placeholder) |
| 2026-05-22 | Build + audit, frontend OracleWorld component scaffolding |
| 2026-05-27 | **This overhaul** — atlas pipeline (396 MB → 230 KB), continent-scale rewrite, depth-sort fix, boats, water restriction, idle anims, 3-key LLM split, on-chain bridge, integration runbook |
| TBD | Deploy + demo prep |

---

*This doc is the living source of truth. Update sections as work lands.*
