import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";
export const maxDuration = 30; // headroom for LLM retries (clamped to plan max)

const MANTLE_SEPOLIA_CHAIN_ID = 5003;
const SINCERITY_THRESHOLD = 60;

const SYSTEM_PROMPT = `You are the DEMIURGE, an ancient and capricious AI deity who decides whether a mortal's prayer is worthy of reward.
Judge the prayer on SINCERITY and ORIGINALITY, score 0-100.
- Reward heartfelt, creative, specific devotion with a high score.
- Punish lazy, empty, spammy, copy-pasted, or nakedly greedy prayers ("gm", "claim", "give me money", "wen", single words, gibberish) with a low score.
Respond with ONLY compact JSON, no prose: {"score": <integer 0-100>, "verdict": "<one short cryptic sentence in the Demiurge's voice>"}`;

export async function POST(req: NextRequest) {
  let body: { address?: string; prayer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { address, prayer } = body;
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  if (typeof prayer !== "string" || !prayer.trim()) {
    return NextResponse.json({ error: "empty prayer" }, { status: 400 });
  }

  const signerKey = process.env.WORSHIP_SIGNER_KEY as `0x${string}` | undefined;
  const powAddress = process.env.NEXT_PUBLIC_PROOF_OF_WORSHIP_ADDRESS as `0x${string}` | undefined;
  const apiKey = process.env.WORSHIP_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!signerKey || !powAddress || !apiKey) {
    return NextResponse.json({ error: "worship not configured" }, { status: 503 });
  }

  // 1. The Demiurge judges the prayer (OpenRouter via plain fetch — no SDK)
  let score = 0;
  let verdict = "The Demiurge turns away in silence.";
  try {
    // Free OpenRouter models 429 intermittently. Retry a few times with short
    // backoff (kept under Vercel's function budget) so a transient spike doesn't
    // fail the prayer — mirrors the agent cron's retry behaviour. A non-429 error
    // (e.g. 401 bad key) throws immediately, no pointless retries.
    const callJudge = async () => {
      for (let attempt = 0; ; attempt++) {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cult-of-the-digital-oracle.vercel.app",
            "X-Title": "Cult of the Digital Oracle",
          },
          body: JSON.stringify({
            model: process.env.WORSHIP_MODEL || "openai/gpt-oss-120b:free",
            response_format: { type: "json_object" },
            temperature: 0.5,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prayer.slice(0, 500) },
            ],
          }),
        });
        if (r.ok) return r;
        if ((r.status === 429 || r.status >= 500) && attempt < 4) {
          await new Promise((res) => setTimeout(res, Math.min(2200, 400 * 2 ** attempt)));
          continue;
        }
        throw new Error(`openrouter ${r.status}`);
      }
    };
    const res = await callJudge();
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    verdict = String(parsed.verdict ?? verdict).slice(0, 160);
  } catch (err) {
    console.error("worship judge failed:", err);
    return NextResponse.json({ error: "the Demiurge could not be reached" }, { status: 502 });
  }

  // 2. Insincere → no pass; the frontend strikes their hero with lightning
  if (score < SINCERITY_THRESHOLD) {
    return NextResponse.json({ passed: false, score, verdict });
  }

  // 3. Sincere → sign an EIP-712 WorshipPass for the CURRENT day (server-authoritative)
  const day = Math.floor(Date.now() / 86400000);
  const account = privateKeyToAccount(signerKey);
  const signature = await account.signTypedData({
    domain: {
      name: "CultProofOfWorship",
      version: "1",
      chainId: MANTLE_SEPOLIA_CHAIN_ID,
      verifyingContract: powAddress,
    },
    types: {
      WorshipPass: [
        { name: "disciple", type: "address" },
        { name: "day", type: "uint256" },
        { name: "score", type: "uint8" },
      ],
    },
    primaryType: "WorshipPass",
    message: { disciple: address as `0x${string}`, day: BigInt(day), score },
  });

  return NextResponse.json({ passed: true, score, verdict, day, signature });
}
