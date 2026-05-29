import { DIVINE_TOOLS, ToolId } from './divineTools';
import { ProphecySentiment } from './prophecyParser';

export interface ToolCandidate {
  toolId: ToolId;
  name: string;
  polarity: 'good' | 'evil';
  weight: number;    // 0-100, probability weight
  reasoning: string; // why this tool is relevant
}

// Map keywords to specific tools
const TOOL_KEYWORD_MAP: Record<number, string[]> = {
  0: ['bless', 'rain', 'heal', 'water', 'faith', 'restore', 'devotion', 'heart'], // Blessing Rain
  1: ['harvest', 'crop', 'food', 'resource', 'abundance', 'overflow', 'store'],     // Harvest Tide
  2: ['missionary', 'soul', 'convert', 'multiply', 'new', 'believer', 'preach'],   // Missionary Wave
  3: ['architect', 'found', 'monument', 'settle', 'city', 'house', 'build', 'stone'], // Architect Gift
  4: ['peace', 'harmony', 'covenant', 'quiet', 'calm', 'stop', 'halt', 'friend'],    // Peace Covenant
  5: ['meteor', 'strike', 'fire', 'sky', 'crash', 'obliterate', 'heaven', 'space'], // Meteor Strike
  6: ['plague', 'disease', 'sick', 'wave', 'virus', 'infection', 'starve', 'fog'],  // Plague Wave
  7: ['drought', 'dry', 'heat', 'sun', 'starve', 'famine', 'water', 'drain'],       // Drought
  8: ['civil', 'war', 'rebel', 'seed', 'neighbor', 'hate', 'fight', 'weapon'],      // Civil War Seed
  9: ['apostasy', 'void', 'dark', 'doubt', 'faith', 'collapse', 'dread', 'whisper'] // Apostasy Wave
};

/**
 * Rank tools based on prophecy sentiment, keywords, forced polarity and available tools.
 * Returns at most 5 sorted candidates.
 */
export function rankTools(
  sentiment: ProphecySentiment,
  forcedPolarity: 'good' | 'evil' | 'free',
  availableTools: ToolId[]
): ToolCandidate[] {
  
  if (availableTools.length === 0) {
    return [];
  }

  // 1. Filter tools based on forced polarity
  let candidateTools = DIVINE_TOOLS.filter(t => availableTools.includes(t.id as ToolId));
  if (forcedPolarity !== 'free') {
    candidateTools = candidateTools.filter(t => t.polarity === forcedPolarity);
  }

  // If no tools match the forced polarity (e.g. all are on cooldown), relax the filter
  if (candidateTools.length === 0) {
    candidateTools = DIVINE_TOOLS.filter(t => availableTools.includes(t.id as ToolId));
  }

  const scoredCandidates: Array<{ toolId: ToolId; baseScore: number; reasoning: string }> = [];

  candidateTools.forEach(tool => {
    let score = 50; // base score
    let reasoning = `Tool available for selection under ${forcedPolarity} restrictions.`;

    // Match keywords
    const mappedKeywords = TOOL_KEYWORD_MAP[tool.id] || [];
    let matchCount = 0;
    const matchedWords: string[] = [];

    sentiment.keywords.forEach(kw => {
      const kwLower = kw.toLowerCase();
      if (mappedKeywords.some(mk => kwLower.includes(mk) || mk.includes(kwLower))) {
        matchCount++;
        matchedWords.push(kw);
      }
    });

    // Sentiment polarity align
    const isGoodTool = tool.polarity === 'good';
    const isPosSentiment = sentiment.tone === 'positive';
    const isNegSentiment = sentiment.tone === 'negative';

    if ((isGoodTool && isPosSentiment) || (!isGoodTool && isNegSentiment)) {
      score += 25; // align bonus
      reasoning = `Thematic alignment with the prophecy's general tone.`;
    } else if ((isGoodTool && isNegSentiment) || (!isGoodTool && isPosSentiment)) {
      score -= 20; // misalignment penalty
      reasoning = `Slight discord with the prophecy's tone, but considered due to cosmic balance.`;
    }

    if (matchCount > 0) {
      score += matchCount * 15;
      reasoning = `Direct keyword mapping found for words: ${matchedWords.join(', ')}.`;
    }

    scoredCandidates.push({
      toolId: tool.id as ToolId,
      baseScore: Math.max(10, score),
      reasoning
    });
  });

  // Sort by base score descending
  scoredCandidates.sort((a, b) => b.baseScore - a.baseScore);

  // Take top 5
  const topCandidates = scoredCandidates.slice(0, 5);

  // Normalize scores into probability weights based on intensity
  const totalBaseScore = topCandidates.reduce((sum, c) => sum + c.baseScore, 0);
  
  const results: ToolCandidate[] = topCandidates.map(c => {
    const tool = DIVINE_TOOLS.find(t => t.id === c.toolId)!;
    
    // Determine weight based on intensity
    let weight = Math.round((c.baseScore / totalBaseScore) * 100);
    
    // If severe intensity, concentrate weight on the top choice
    if (sentiment.intensity === 'severe' && topCandidates[0].toolId === c.toolId) {
      weight = Math.min(95, Math.round(weight * 1.4));
    } else if (sentiment.intensity === 'mild') {
      // flatten weights if mild
      weight = 20; // equal distribution
    }

    return {
      toolId: c.toolId,
      name: tool.name,
      polarity: tool.polarity,
      weight,
      reasoning: c.reasoning
    };
  });

  // Ensure weights sum to 100 or close
  const sumWeights = results.reduce((sum, r) => sum + r.weight, 0);
  if (sumWeights > 0) {
    results.forEach(r => {
      r.weight = Math.round((r.weight / sumWeights) * 100);
    });
  }

  // Sort by final weight descending
  results.sort((a, b) => b.weight - a.weight);

  return results;
}
