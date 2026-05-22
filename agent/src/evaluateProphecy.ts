import OpenAI from "openai";
import type { ChainSnapshot } from "./fetchChainData";

const EVAL_SYSTEM = `You are a strict fulfillment judge for an on-chain oracle that watches its own community of believers.

Given a prophecy and a snapshot of the Mantle chain + the Temple's current state, decide how well the prophecy maps to what actually happened. Ground your answer only in the supplied metrics. Do not invent facts.

Pay special attention to Temple-specific signals:
- If the prophecy implied growth ("new souls", "the faithful multiply", "the ledger expands") and disciples or faith actually increased → score higher
- If the prophecy implied exodus ("apostates depart", "the void claims", "the ledger thins") and disciples exited or faith decreased → score higher
- If the prophecy referenced the chain's pulse and network activity was elevated → score higher

Output ONLY a JSON object: {"score": <0-100>, "reason": "<one sentence>"}`;

export async function evaluateProphecy(
  client: OpenAI,
  prophecyText: string,
  chainData: ChainSnapshot
): Promise<{ score: number; reason: string; evidence: string }> {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: EVAL_SYSTEM },
      {
        role: "user",
        content: `Prophecy: "${prophecyText}"\n\nMantle chain + Temple snapshot:\n${chainData.summary}\n\nScore the fulfillment.`,
      },
    ],
    max_tokens: 120,
    temperature: 0.15,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
  const clean = raw.replace(/```json|```/g, "").trim();

  let parsed: { score?: number; reason?: string };
  try {
    parsed = JSON.parse(clean) as { score?: number; reason?: string };
  } catch {
    parsed = { score: baselineSignalScore(chainData), reason: "Fallback score from deterministic chain signals." };
  }

  const semanticScore = clampScore(parsed.score ?? baselineSignalScore(chainData));
  const signalScore = baselineSignalScore(chainData);
  const templeBonus = templeActivityBonus(chainData);

  // Blend: 65% semantic LLM judgment, 25% chain signals, 10% temple activity bonus
  const score = clampScore(Math.round(semanticScore * 0.65 + signalScore * 0.25 + templeBonus * 0.10));
  const reason =
    (parsed.reason?.slice(0, 160) ??
    `Hybrid score blended model judgment with chain signals and temple activity.`);

  const t = chainData.temple;
  const s = chainData.signals;
  const evidence = [
    `hybrid=${score}`,
    `model=${semanticScore}`,
    `baseline=${signalScore}`,
    `templeBonus=${templeBonus}`,
    `disciples=${t.discipleCount}`,
    `faith=${t.totalFaithUsdy}`,
    `new24h=${t.newDisciples24h}`,
    `exited24h=${t.exitedDisciples24h}`,
    `tx24h=${s.estimatedTransactions24h}`,
    `usdy=${s.usdyTransferCount}`,
  ].join("; ");

  return { score, reason, evidence };
}

function templeActivityBonus(chainData: ChainSnapshot): number {
  const t = chainData.temple;
  let score = 0;

  // Reward net disciple growth
  if (t.netGrowth24h > 0) score += Math.min(40, t.netGrowth24h * 15);
  // Reward any Temple activity at all (joins or exits = the prophecy touched people)
  const totalActivity = t.newDisciples24h + t.exitedDisciples24h;
  score += Math.min(30, totalActivity * 10);
  // Reward a healthy faith pool
  const faithFloat = parseFloat(t.totalFaithUsdy);
  if (faithFloat > 0) score += Math.min(30, Math.round(faithFloat / 10));

  return clampScore(score);
}

function baselineSignalScore(chainData: ChainSnapshot): number {
  const s = chainData.signals;
  let score = 25;

  score += Math.min(25, Math.round(s.estimatedTransactions24h / 1_000));
  score += Math.min(15, Math.round(s.sampledActiveAddresses / 5));
  score += Math.min(15, Math.round(s.contractCallRatio / 5));
  score += Math.min(10, s.largeValueTransfers * 2);
  score += Math.min(10, s.usdyTransferCount);

  return clampScore(score);
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}
