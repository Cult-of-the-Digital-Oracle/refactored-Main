# End-to-End Integration Test

Walkthrough untuk verifikasi seluruh stack (3 AI agent → on-chain → /oracle-world)
bekerja sebagai satu kesatuan.

## Pre-requisites

- Wallet dengan **≥ 0.1 MNT** di Mantle Sepolia (untuk gas)
- **OpenRouter API key** ([openrouter.ai/keys](https://openrouter.ai/keys))
- Node 20+ / npm 10+

---

## 1. Deploy kontrak (kalau belum)

```bash
cd contracts
cp .env.example .env
# isi PRIVATE_KEY, ORACLE_ADDRESS, dst.
npx hardhat compile
npx hardhat run scripts/deploy.ts --network mantleSepolia
```

Output akan print 5 alamat: `MockUSDY`, `OracleMessage`, `TempleVault`,
`BlessingDistributor`, `CivilizationLog`. Catat semuanya.

## 2. Konfigurasi `agent/.env`

```bash
cd agent
cp .env.example .env
```

Edit `.env` dan isi:

```
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
ORACLE_PRIVATE_KEY=<wallet privkey>
ORACLE_MESSAGE_ADDRESS=<from step 1>
TEMPLE_VAULT_ADDRESS=<from step 1>
BLESSING_DISTRIBUTOR_ADDRESS=<from step 1>
USDY_ADDRESS=<from step 1>
CIV_LOG_ADDRESS=<from step 1>

# Pilih salah satu strategi LLM:
# (a) satu key untuk semua AI:
OPENROUTER_API_KEY=sk-or-v1-...
# (b) atau key terpisah per AI:
# ORACLE_API_KEY=sk-or-v1-...
# EVALUATOR_API_KEY=sk-or-v1-...
# DEMIURGE_API_KEY=sk-or-v1-...
```

Verifikasi:
```bash
npm install
npx tsx scripts/verifyEnv.ts
```

Output yang diharapkan: semua `✓`, balance > 0.05 MNT, CIV_LOG_ADDRESS punya code.

## 3. Konfigurasi `apps/web/.env.local`

```bash
cd ../apps/web
cp .env.example .env.local
```

Isi semua `NEXT_PUBLIC_*_ADDRESS` dengan address yang sama dari step 1.

## 4. Jalankan agent (single-cycle)

Set `CRON_SCHEDULE=""` di `.env` untuk single-run mode, lalu:

```bash
cd ../../agent
npm run dev
```

Watch console — yang harus muncul:

```
Oracle starting (single-run mode).
[ISO time] Oracle + Civilization cycle starting...
Posting daily civilization snapshot to CivilizationLog.sol (day NNNNN)...
Snapshot posted successfully: 0x...
Chain data fetched: <block>
Temple: <N> disciples, <X> USDY staked
[evaluating yesterday's prophecy if any]
Generating today's prophecy...
  Prophecy: "<text>"
  Posted on-chain (day NNNNN): 0x...
Demiurge analyzing today's prophecy to schedule tomorrow's divine event...
Demiurge decided. Scheduled for block day NNNNN+1.
Demiurge preview posted on-chain successfully: 0x...
Oracle + Civilization cycle complete.
```

Kalau ada error, fix env / contract → re-run.

## 5. Verifikasi on-chain

Buka [Mantlescan Sepolia](https://sepolia.mantlescan.xyz/) untuk `CIV_LOG_ADDRESS`:
- Tx terbaru: `logSnapshot`, `logDemiurgePreview` → masing-masing succeed
- Read contract: `getLatestPreview` → return 5 toolIds + weights non-zero
- Read contract: `getSnapshot(currentDay)` → snapshotAt > 0

## 6. Frontend live check

```bash
cd ../apps/web
npm install
npm run dev
```

Buka `http://localhost:3000/oracle-world` di browser.

**Yang harus terlihat:**

| Komponen | Sebelum bridge (sandbox saja) | Sekarang (live on-chain) |
|---|---|---|
| **DemiurgeToolsPanel** (kanan) | Mock 5 candidates | **5 candidate dari `getLatestPreview` on-chain**, weight sesuai AI #3 |
| **BalanceIndicator** (atas tengah) | Mock history | **History 10 event terakhir** dari `getDivineEventCount` + `getDivineEvent` |
| **ProphecyOverlay** (kiri) | Hardcoded | (placeholder hardcoded, AI #1 prophecy ada di `/prophecies`) |
| **Continent simulator** | Worker tick lokal | Worker tick lokal **+ replay on-chain divine events** |

## 7. Fire a divine event for the demo

Untuk demo live ke judges (saat cron belum jalan), trigger manual:

```bash
cd agent
# Meteor Strike (toolId 5) at region 0
npx tsx scripts/demoTriggerEvent.ts 5 0 800
```

Output: tx hash. Tunggu 15 detik (frontend polling cycle) — di /oracle-world,
visual meteor + screen shake harus muncul, BalanceIndicator menunjukkan event
baru di tail.

**Itu** validasi end-to-end yang sebenarnya: chain emit → frontend dengar →
worker apply visual.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Missing env var: CIV_LOG_ADDRESS` | Belum copy `.env.example` → `.env` | Step 2 |
| Tx revert dengan "Only civ engine" | Salah private key untuk CivilizationLog | Set `CIV_ENGINE_PRIVATE_KEY` ke wallet yang di-`CIV_ENGINE_ADDRESS` saat deploy, atau pakai oracle |
| Frontend pakai mock 5 candidates terus | `NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS` belum di-set | Edit `apps/web/.env.local`, restart `npm run dev` |
| `Worker` error di console browser | Atlas WebP atau worker.ts gagal load | Re-run `node scripts/build-atlas.mjs` di apps/web/ |
| OpenRouter 401 | API key salah / kuota habis | Cek dashboard openrouter, regenerate |
