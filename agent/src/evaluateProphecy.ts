import OpenAI from "openai";
import type { ChainSnapshot } from "./fetchChainData";

const EVAL_SYSTEM = `You are a strict fulfillment judge for an on-chain oracle.

Given a prophecy and a sampled Mantle chain snapshot, decide how well the prophecy maps to the data. Ground your answer only in the supplied metrics. Do not invent facts.

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
        content: `Prophecy: "${prophecyText}"\n\nMantle chain snapshot:\n${chainData.summary}\n\nScore the fulfillment.`,
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
  const score = clampScore(Math.round(semanticScore * 0.7 + signalScore * 0.3));
  const reason =
    parsed.reason?.slice(0, 280) ??
    `Hybrid score blended model judgment with a ${signalScore}/100 chain activity baseline.`;

  return {
    score,
    reason,
    evidence: `hybrid=${score}; model=${semanticScore}; signalBaseline=${signalScore}; ${chainData.evidence}`,
  };
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
