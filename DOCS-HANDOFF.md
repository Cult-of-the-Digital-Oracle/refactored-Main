# Handoff — GitBook Docs + Temuan dari Kode

> Catatan buat **Dave & Hans** (dan Claude/AI kalian). Dibikin pas nyusun dokumentasi GitBook lengkap untuk *Cult of the Digital Oracle*. Isinya: apa yang udah ada, **4 hal di kode yang sebaiknya dirapikan**, dan cara docs nyambung ke kode biar gampang di-maintain. Ringkas, langsung actionable.

---

## 1. Apa yang udah dibikin

- **GitBook docs lengkap (39 halaman)** ada di folder **`docs/`**, di branch **`docs/gitbook`**.
- Config git-sync: **`.gitbook.yaml`** di root repo (`root: ./docs/`). Tinggal connect GitBook ke repo via **GitHub Git Sync**, pilih branch, beres.
- Cakupan: konsep/belief-economy, arsitektur, **3 AI agent** (Oracle/Evaluator/Demiurge) + Civilization Engine, **5 smart contract** (tiap kontrak halaman sendiri), frontend + **Oracle World** (god-sim), API reference, deployment guide, demo walkthrough + 5-min script, pitch/judge-Q&A, virality, troubleshooting.
- Style: badges, callout `{% hint %}`, persona `{% tabs %}`, diagram Mermaid (graph/sequence/state), tabel kontrak, FAQ. (Block `{% hint %}`/`{% tabs %}` cuma render di GitBook, bukan preview GitHub mentah.)

**Kabar baik:** docs di-audit ulang per halaman lawan kode asli — **implementasi kalian akurat & rapi.** Function signature, custom errors, slot-packing, hybrid-score Evaluator (0.50/0.20/0.10/0.20), katalog 10 divine tools, konstanta (threshold 70, yield 0.5 USDY, magnitude 500), semua cocok sama source. Bagus.

---

## 2. ⚠️ 4 hal di KODE yang sebaiknya dirapikan (ini yang paling penting buat progres kalian)

Docs udah nyuruh pembaca verifikasi/hati-hati di titik ini, tapi lebih bagus kalau dibenerin langsung di kode biar konsisten.

### (a) Model LLM stale di docs lama — kode pakai OpenRouter, bukan Groq
- **Masalah:** `README.md` + `CLAUDE.md` lama nyebut **Groq + `llama-3.3-70b`**. Tapi kode (`agent/src/index.ts`) pakai **OpenRouter**: `google/gemini-2.5-flash` (Oracle & Evaluator) + `anthropic/claude-3-5-sonnet` (Demiurge).
- **Fix:** update README.md + CLAUDE.md biar nyebut OpenRouter + model yang bener. (GitBook docs udah pakai yang bener.)

### (b) Alamat kontrak belum direkonsiliasi + CivilizationLog ga punya alamat
- **Masalah:** ada **2 set alamat beda** — set di `README.md`/`apps/web` (NEXT_PUBLIC) ≠ set di `agent`-`CLAUDE.md` — buat OracleMessage/TempleVault/BlessingDistributor. Cuma **USDY yang sama** (`0x7ADbf2a8b9348cC1F6Ee88Db12F9415Ee55b9500`). **CivilizationLog ga punya alamat published** sama sekali (cuma placeholder). Ga ada `deployments/*.json`, dan `scripts/deploy.ts` deploy fresh tiap run tanpa nyimpen artifact → gampang drift.
- **Kenapa penting:** kalau agent nulis ke 1 set, frontend baca set lain → prophecy kosong + `/oracle-world` fallback ke mock. Ini bug integrasi #1.
- **Fix:** deploy sekali, **catat 5 alamat**, tulis ke **dua** env (`agent/.env` + `apps/web/.env.local`), commit `deployments/sepolia.json` biar ga ilang. Verify di [sepolia.mantlescan.xyz](https://sepolia.mantlescan.xyz).

### (c) CI `.github/workflows/oracle.yml` — env salah
- **Masalah:** workflow inject **`GROQ_API_KEY`** (kode butuh `OPENROUTER_API_KEY` / per-role) + **ga lewatin `CIV_LOG_ADDRESS`** (dan `CIV_ENGINE_PRIVATE_KEY`).
- **Akibat:** cron CI bakal **gagal/ skip** post civ snapshot + divine event. Cron jadi cuma jalan parsial.
- **Fix:** ganti secret/env di workflow ke OpenRouter + tambah `CIV_LOG_ADDRESS` (+ `CIV_ENGINE_PRIVATE_KEY` kalau pakai key terpisah).

### (d) `/oracle-world` — 2 wiring kecil belum nyambung (quick wins, demo-impactful)
- **ProphecyOverlay hardcoded:** teks prophecy di `/oracle-world` masih hardcoded (gantian `dayIndex % 2`), **belum baca `OracleMessage`**. Prophecy live yang asli ada di `/` + `/prophecies`. → wiring overlay ke `OracleMessage.todaysProphecy` = win kecil tapi keliatan pas demo.
- **getSnapshot fetched tapi ga ditampilin:** `page.tsx` udah baca `getSnapshot(dayIndex)` on-chain & simpan ke state `onChainSnapshot`, tapi **state-nya ga dipakai** di HUD manapun (stats HUD masih dari worker sim lokal). → tinggal pasang ke panel.

### Bonus (super minor, opsional): komentar di kontrak salah angka
- `contracts/contracts/TempleVault.sol` baris ~18: komentar bilang `uint88 stakeAmount ... up to ~309 trillion USDY`. Matematikanya `2^88 / 1e6 ≈ 309 **quintillion**` (3.09e20), bukan trillion. Kontraknya bener, cuma komentarnya. Ganti kalau sempet.

---

## 3. Biar docs tetep akurat pas kalian ubah kode (mapping)

Kalau ubah salah satu di kiri, update doc di kanan:

| Ubah di kode | Update doc |
|---|---|
| Fungsi/event/ABI kontrak | `docs/contracts/<nama>.md` + `docs/api/contracts.md` |
| Alamat kontrak / deploy | `docs/contracts/deployment.md` |
| Model/prompt/score AI | `docs/ai-agents/{oracle,evaluator,demiurge}.md` |
| Katalog divine tools / efek | `docs/ai-agents/demiurge.md` + `civilization-engine.md` (samain unit-nya!) |
| Sim civ (konstanta, tick) | `docs/ai-agents/civilization-engine.md` |
| Route/komponen frontend | `docs/frontend/pages.md` |
| `/oracle-world` (worker/atlas/poll) | `docs/frontend/oracle-world.md` |
| Env / script / CI | `docs/deployment/*` + `docs/quick-start.md` |

**Sumber kebenaran ABI:** `apps/web/src/lib/contracts.ts`. Kalau nambah fungsi kontrak, update di situ → frontend & docs ngikut.

---

## 4. Cara extend / edit docs

- **Nav:** `docs/SUMMARY.md` (urutan + judul sidebar GitBook).
- **Landing:** `docs/README.md`.
- **Config sync:** `.gitbook.yaml` (root repo).
- **Konvensi:** Mermaid label jangan pakai kurung mentah `()` di node flowchart (pakai `·` atau `&#40;`), biar ga error render. Link antar-halaman pakai path relatif (semua 248 link udah diverifikasi resolve).

---

## TL;DR (buat Claude kalian)

> Docs GitBook lengkap udah ada di `docs/` (branch `docs/gitbook`), akurat & terverifikasi vs kode. **Prioritas progres kalian = benerin 4 hal di §2:** (a) update ref model Groq→OpenRouter di README/CLAUDE, (b) rekonsiliasi alamat 5 kontrak + commit `deployments/*.json` + isi alamat CivilizationLog, (c) fix env CI `oracle.yml` (OpenRouter + `CIV_LOG_ADDRESS`), (d) wire `/oracle-world` ProphecyOverlay ke `OracleMessage` + tampilin `getSnapshot` di HUD. Sisanya kode kalian udah solid.
