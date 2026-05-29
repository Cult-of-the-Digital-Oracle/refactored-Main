import OpenAI from 'openai';

export interface ProphecySentiment {
  tone: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  intensity: 'mild' | 'moderate' | 'severe';
  impliedEvent: string;
}

/**
 * Parses prophecy sentiment and keywords using LLM or structured keyword analysis fallback.
 */
export async function parseProphecySentiment(
  client: OpenAI,
  prophecyText: string,
  modelName: string = process.env.DEMIURGE_MODEL || "anthropic/claude-3-5-sonnet"
): Promise<ProphecySentiment> {
  
  const systemPrompt = `You are a cryptic parser. Analyze the given prophecy text and return a JSON object with:
{
  "tone": "positive" | "negative" | "neutral",
  "keywords": ["array", "of", "relevant", "thematic", "words"],
  "intensity": "mild" | "moderate" | "severe",
  "impliedEvent": "a brief 1-sentence explanation of what will occur"
}
ONLY return the raw JSON object. Do not include markdown code block syntax or any conversational filler.`;

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Prophecy: "${prophecyText}"` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    console.log('LLM raw prophecy parse content:', content);
    
    // Clean up potential markdown formatting if returned anyway
    const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson) as ProphecySentiment;
    
    // Standardize tone & intensity values
    if (!['positive', 'negative', 'neutral'].includes(result.tone)) {
      result.tone = 'neutral';
    }
    if (!['mild', 'moderate', 'severe'].includes(result.intensity)) {
      result.intensity = 'moderate';
    }
    if (!Array.isArray(result.keywords)) {
      result.keywords = [];
    }

    return result;
  } catch (err) {
    console.error('LLM parsing failed. Falling back to local rule-based parsing...', err);
    return getFallbackSentiment(prophecyText);
  }
}

/**
 * Fallback sentiment analysis based on simple keyword matches.
 */
function getFallbackSentiment(text: string): ProphecySentiment {
  const lowercase = text.toLowerCase();
  
  const positiveKeywords = ['growth', 'new', 'bless', 'fertility', 'peace', 'harvest', 'architecture', 'monument', 'harmony', 'heal', 'water', 'rain', 'faith'];
  const negativeKeywords = ['meteor', 'strike', 'plague', 'disease', 'drought', 'civil', 'war', 'destroy', 'death', 'famine', 'darkness', 'void', 'fire', 'fury', 'schism', 'apostate', 'collapse'];
  
  const foundKeywords: string[] = [];
  let score = 0;

  positiveKeywords.forEach(kw => {
    if (lowercase.includes(kw)) {
      foundKeywords.push(kw);
      score += 1;
    }
  });

  negativeKeywords.forEach(kw => {
    if (lowercase.includes(kw)) {
      foundKeywords.push(kw);
      score -= 1;
    }
  });

  let tone: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0) tone = 'positive';
  else if (score < 0) tone = 'negative';

  let intensity: 'mild' | 'moderate' | 'severe' = 'moderate';
  if (foundKeywords.length > 4) intensity = 'severe';
  else if (foundKeywords.length <= 1) intensity = 'mild';

  return {
    tone,
    keywords: foundKeywords,
    intensity,
    impliedEvent: `Deterministic parsing implies a ${tone} event of ${intensity} intensity.`
  };
}
