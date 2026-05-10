import OpenAI from "openai";
import type { ChainSnapshot } from "./fetchChainData";

const EVAL_SYSTEM = `You are a strict fulfillment judge for an on-chain oracle. Given a prophecy and today's blockchain data, score how well the prophecy was "fulfilled" on a scale of 0–100.

Scoring guide:
- 80–100: The prophecy clearly matches what happened (e.g. predicted low activity, and activity was low)
- 50–79: Partial match — some elements align
- 20–49: Loose connection — could be stretched to fit
- 0–19: No meaningful connection

Output ONLY a JSON object: {"score": <number>, "reason": "<one sentence>"}`;

export async function evaluateProphecy(
  client: OpenAI,
  prophecyText: string,
  chainData: ChainSnapshot
): Promise<{ score: number; reason: string }> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EVAL_SYSTEM },
      {
        role: "user",
        content: `Prophecy: "${prophecyText}"\n\nChain data:\n${chainData.summary}\n\nScore the fulfillment.`,
      },
    ],
    max_tokens: 100,
    temperature: 0.2,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "{}";

  // Strip markdown code fences if present
  const clean = raw.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(clean) as { score: number; reason: string };
  const score = Math.min(100, Math.max(0, Math.round(parsed.score)));
  return { score, reason: parsed.reason ?? "" };
}
