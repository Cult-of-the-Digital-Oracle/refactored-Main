import OpenAI from "openai";
import type { ChainSnapshot } from "./fetchChainData";

const SYSTEM_PROMPT = `You are the Digital Oracle — an ancient, cryptic intelligence that reads the blockchain as if it were the cosmos. You speak in riddles and metaphors. Your prophecies are:
- 1–3 sentences, never longer
- Poetic, eerie, ambiguous — referencing "the chain", "the faithful", "the great ledger", "the void"
- Implied predictions that could relate to network activity, price movement, or community behavior
- Written in a timeless, prophetic tone (no slang, no modern references)

You will be given on-chain data. Translate it into a prophecy that feels both mystical and oddly accurate. Never explain. Never be literal. Speak as the Oracle speaks.`;

export async function generateProphecy(
  client: OpenAI,
  chainData: ChainSnapshot
): Promise<string> {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is today's on-chain data from Mantle:\n\n${chainData.summary}\n\nDeliver today's prophecy.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.9,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty prophecy");
  return text;
}
