# Deploy the Frontend

Configure and ship the Next.js app to Vercel.

***

## 1. Configure `apps/web/.env.local`

```bash
cd apps/web
cp .env.example .env.local
```

```env
NEXT_PUBLIC_WC_PROJECT_ID=<walletconnect project id>
NEXT_PUBLIC_ORACLE_MESSAGE_ADDRESS=
NEXT_PUBLIC_TEMPLE_VAULT_ADDRESS=
NEXT_PUBLIC_BLESSING_DISTRIBUTOR_ADDRESS=
NEXT_PUBLIC_USDY_ADDRESS=
NEXT_PUBLIC_CIVILIZATION_LOG_ADDRESS=
```

{% hint style="danger" %}
Use the **exact same five addresses** as `agent/.env`. If the frontend reads a different deployment than the agent writes, the landing prophecy will be empty and `/oracle-world` will fall back to mock candidates. This is the #1 integration bug.
{% endhint %}

***

## 2. Run locally

```bash
npm install
npm run dev          # :3000, Turbopack
```

Visit:

* `/` — should show today's prophecy (after the agent has run at least once)
* `/temple` — faucet → approve → enter should mint a Disciple NFT
* `/oracle-world` — the Demiurge panel should show **on-chain** candidates, not mocks

***

## 3. Build

```bash
npx next build       # production build + type check
```

A clean build is the type-check gate. Remember the `tsconfig` constraint: `"target": "ES2020"` (BigInt literals).

***

## 4. Deploy to Vercel

1. Import the repo into Vercel; set the **root directory to `apps/web`**.
2. Add all six `NEXT_PUBLIC_*` env vars in **Project → Settings → Environment Variables**.
3. Deploy. Vercel auto-builds on push.

The reference deployment lives at **[web-red-nine-58.vercel.app](https://web-red-nine-58.vercel.app)**.

***

## 5. Rebuild atlases (only if you changed sprites)

The `/oracle-world` atlases are checked in, so you don't need this for a normal deploy. If you edited sprites:

```bash
cd apps/web
node scripts/build-atlas.mjs     # rebuilds units/buildings/vfx/env.webp + manifest.json
```

***

## Post-deploy checklist

* [ ] Landing shows a live prophecy
* [ ] Wallet connects (ConnectKit) on Mantle Sepolia
* [ ] Faucet → approve → enter mints a Disciple
* [ ] `/oracle-world` reads on-chain Demiurge preview + divine events
* [ ] A shared `/disciple/[tokenId]` link unfurls with an OG image

→ Verify the full flow in the [Demo Walkthrough](../demo/walkthrough.md).
