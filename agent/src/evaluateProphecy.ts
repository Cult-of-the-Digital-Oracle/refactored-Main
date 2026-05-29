import OpenAI from "openai";
import type { ChainSnapshot } from "./fetchChainData";

const EVAL_SYSTEM = `You are a strict fulfillment judge for an on-chain oracle that watches its own community of believers and its simulated civilization.

Given a prophecy and a snapshot of the Mantle chain + the Temple + the Civilization's yesterday and today state, decide how well the prophecy maps to what actually happened. Ground your answer only in the supplied metrics. Do not invent facts.

Pay special attention to Temple and Civilization signals:
1. Temple signals:
- If the prophecy implied growth in the staking pool and faith/disciples actually increased → score higher.
- If the prophecy implied exodus or staking decline and faith/disciples decreased → score higher.
2. Civilization signals:
- If the prophecy predicted dark events (plague, sky fire, meteor, war) and an evil tool was executed or population dropped → score higher.
- If the prophecy predicted growth, monuments, peace and a good tool was executed, resources or faith rose → score higher.
- If it predicted schisms or conversions, and factions changed or active regions split → score higher.

Output ONLY a JSON object: {"score": <0-100>, "reason": "<one sentence>"}`;

export interface CivSnapshotData {
  totalEntities: number;
  totalPopulation: number;
  totalFaith: bigint;
  dominantFaction: number;
  activeRegions: number;
}

export async function evaluateProphecy(
  client: OpenAI,
  prophecyText: string,
  chainData: ChainSnapshot,
  yesterdayCiv?: CivSnapshotData,
  todayCiv?: CivSnapshotData,
  executedTools?: number[],
  modelName: string = process.env.ORACLE_MODEL || "google/gemini-2.5-flash"
): Promise<{ score: number; reason: string; evidence: string }> {
  
  let civSummary = "";
  if (yesterdayCiv && todayCiv) {
    const yFaction = yesterdayCiv.dominantFaction === 0 ? "Believer" : yesterdayCiv.dominantFaction === 1 ? "Apostate" : "Balanced";
    const tFaction = todayCiv.dominantFaction === 0 ? "Believer" : todayCiv.dominantFaction === 1 ? "Apostate" : "Balanced";
    const yFaith = (Number(yesterdayCiv.totalFaith) / 1e6).toFixed(2);
    const tFaith = (Number(todayCiv.totalFaith) / 1e6).toFixed(2);

    civSummary += `\nSimulated Civilization Changes (Yesterday -> Today):\n`;
    civSummary += `- Total entities: ${yesterdayCiv.totalEntities} -> ${todayCiv.totalEntities}\n`;
    civSummary += `- Total population: ${yesterdayCiv.totalPopulation} -> ${todayCiv.totalPopulation}\n`;
    civSummary += `- Total faith: ${yFaith} -> ${tFaith}\n`;
    civSummary += `- Dominant faction: ${yFaction} -> ${tFaction}\n`;
    civSummary += `- Active Regions: ${yesterdayCiv.activeRegions} -> ${todayCiv.activeRegions}\n`;
    
    if (executedTools && executedTools.length > 0) {
      civSummary += `- Divine Tools Executed: [${executedTools.join(", ")}]\n`;
    } else {
      civSummary += `- Divine Tools Executed: None\n`;
    }
  }

  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: EVAL_SYSTEM },
      {
        role: "user",
        content: `Prophecy: "${prophecyText}"\n\nMantle chain + Temple snapshot:\n${chainData.summary}\n${civSummary}\n\nScore the fulfillment.`,
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
    parsed = { score: baselineSignalScore(chainData), reason: "Fallback score from deterministic signals." };
  }

  const semanticScore = clampScore(parsed.score ?? baselineSignalScore(chainData));
  const signalScore = baselineSignalScore(chainData);
  const templeBonus = templeActivityBonus(chainData);
  
  // Civilization bonus/penalty score based on hard signals
  let civBonus = 50; // default neutral
  if (yesterdayCiv && todayCiv) {
    const popDiff = todayCiv.totalPopulation - yesterdayCiv.totalPopulation;
    const faithDiff = Number(todayCiv.totalFaith - yesterdayCiv.totalFaith) / 1e6;
    
    // Check if prophecy has matching keywords for what actually happened
    const propLower = prophecyText.toLowerCase();
    
    // Match growth
    if (popDiff > 0 && (propLower.includes("grow") || propLower.includes("rise") || propLower.includes("multiply") || propLower.includes("new"))) {
      civBonus += 20;
    }
    // Match disaster
    if (popDiff < -5 && (propLower.includes("meteor") || propLower.includes("plague") || propLower.includes("die") || propLower.includes("doom") || propLower.includes("ash") || propLower.includes("strike"))) {
      civBonus += 25;
    }
    // Match faith rise/drop
    if (faithDiff > 10 && (propLower.includes("devotion") || propLower.includes("belief") || propLower.includes("faith") || propLower.includes("glory"))) {
      civBonus += 20;
    }
    if (faithDiff < -10 && (propLower.includes("void") || propLower.includes("doubt") || propLower.includes("apostasy") || propLower.includes("collapse"))) {
      civBonus += 20;
    }
  }
  civBonus = clampScore(civBonus);

  // Blended score: 50% LLM semantic judgment, 20% chain signals, 10% temple activity, 20% civilization signal matching
  const score = clampScore(Math.round(semanticScore * 0.50 + signalScore * 0.20 + templeBonus * 0.10 + civBonus * 0.20));
  const reason =
    (parsed.reason?.slice(0, 240) ??
    `Hybrid score blended model judgment with chain signals, temple activity, and civilization metrics.`);

  const t = chainData.temple;
  const s = chainData.signals;
  const evidence = [
    `hybrid=${score}`,
    `model=${semanticScore}`,
    `baseline=${signalScore}`,
    `templeBonus=${templeBonus}`,
    `civBonus=${civBonus}`,
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
