import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { ethers } from 'ethers';
import seedrandom from 'seedrandom';
import { CivilizationEngine } from '../civilization/civilizationEngine';
import { postDivineEventToChain } from '../civilization/civSnapshot';
import { CooldownManager, ToolId, DIVINE_TOOLS } from './divineTools';
import { BalanceTracker } from './balanceTracker';
import { parseProphecySentiment } from './prophecyParser';
import { rankTools, ToolCandidate } from './toolSelector';

export interface DemiurgePreview {
  toolIds: [number, number, number, number, number];
  weights: [number, number, number, number, number];
  forcedPolarity: number; // 0=evil, 1=good, 2=free
  decisionAt: bigint;
  scheduledFor: bigint;
  prophecyHash: string; // Excerpt/hash of prophecy
}

const CIV_LOG_ABI = [
  "function postDemiurgePreview(tuple(uint8[5] toolIds, uint8[5] weights, uint8 forcedPolarity, uint64 decisionAt, uint64 scheduledFor, string prophecyHash) preview) external"
];

export class DemiurgeAgent {
  private cooldownManager: CooldownManager;
  private balanceTracker: BalanceTracker;
  private scheduledExecution: { toolId: ToolId; executeAt: number; day: number } | null = null;
  private stateFilePath: string;

  constructor(
    private openai: OpenAI,
    private civEngine: CivilizationEngine,
    private signer: ethers.Wallet,
    private civLogAddress: string,
    stateFilePath?: string,
    private modelName: string = process.env.DEMIURGE_MODEL || "anthropic/claude-3-5-sonnet"
  ) {
    this.cooldownManager = new CooldownManager();
    this.balanceTracker = new BalanceTracker();
    this.stateFilePath = stateFilePath || process.env.DEMIURGE_STATE_FILE || path.join(process.cwd(), 'demiurge-state.json');
  }

  /**
   * Initializes Demiurge Agent state.
   */
  async loadState(): Promise<void> {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        const raw = fs.readFileSync(this.stateFilePath, 'utf8');
        const data = JSON.parse(raw);
        
        this.cooldownManager.deserialize(data.cooldowns || {});
        this.balanceTracker.deserialize(data.balanceHistory || []);
        
        if (data.scheduledExecution) {
          this.scheduledExecution = {
            toolId: data.scheduledExecution.toolId as ToolId,
            executeAt: data.scheduledExecution.executeAt,
            day: data.scheduledExecution.day
          };
          console.log(`Loaded scheduled divine event: Tool ${this.scheduledExecution.toolId} for timestamp ${this.scheduledExecution.executeAt}`);
        } else {
          this.scheduledExecution = null;
        }
        return;
      } catch (err) {
        console.error('Failed to load Demiurge state, creating new...', err);
      }
    }
    this.scheduledExecution = null;
  }

  /**
   * Saves Demiurge Agent state to disk.
   */
  async saveState(): Promise<void> {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        cooldowns: this.cooldownManager.serialize(),
        balanceHistory: this.balanceTracker.serialize(),
        scheduledExecution: this.scheduledExecution
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save Demiurge state to disk', err);
    }
  }

  /**
   * Analyzes today's prophecy and schedules the divine tool execution.
   */
  async decide(prophecyText: string, currentDay: number): Promise<DemiurgePreview> {
    console.log(`\n🔮 Demiurge parsing prophecy for day ${currentDay}...`);
    
    // 1. Parse sentiment using LLM
    const sentiment = await parseProphecySentiment(this.openai, prophecyText, this.modelName);
    console.log(`Sentiment parsed. Tone: ${sentiment.tone}, Keywords: ${sentiment.keywords.join(', ')}`);

    // 2. Check good/evil balance to see if any polarity is forced
    const forcedPol = this.balanceTracker.getForcedPolarity();
    console.log(`Cosmic balance forced polarity: ${forcedPol}`);

    // 3. Get list of available tools (excluding cooldowns)
    const availableTools: ToolId[] = [];
    for (let i = 0; i < 10; i++) {
      if (this.cooldownManager.canUse(i as ToolId, currentDay)) {
        availableTools.push(i as ToolId);
      }
    }
    console.log(`Available tools (not on cooldown): ${availableTools.join(', ')}`);

    // 4. Rank tools and generate candidates
    const candidates = rankTools(sentiment, forcedPol, availableTools);
    console.log(`Candidates generated:`);
    candidates.forEach(c => console.log(`  - Tool ${c.toolId} (${c.name}): weight ${c.weight}% - ${c.reasoning}`));

    if (candidates.length === 0) {
      throw new Error("No divine tools available to schedule!");
    }

    // 5. Deterministically pick one based on weights and day seed
    const seed = `demiurge-pick-${currentDay}-${prophecyText.substring(0, 10)}`;
    const rng = seedrandom(seed);
    const roll = rng() * 100;
    
    let accumulatedWeight = 0;
    let selectedCandidate = candidates[0];
    for (const c of candidates) {
      accumulatedWeight += c.weight;
      if (roll <= accumulatedWeight) {
        selectedCandidate = c;
        break;
      }
    }
    
    console.log(`🎲 Seeded roll was ${roll.toFixed(2)}. Selected tool: ${selectedCandidate.toolId} (${selectedCandidate.name})`);

    // 6. Schedule execution for 24h later (86,400,000 ms)
    const decisionAt = Date.now();
    const scheduledFor = decisionAt + 86400000; // 24h later

    this.scheduledExecution = {
      toolId: selectedCandidate.toolId,
      executeAt: scheduledFor,
      day: currentDay
    };
    await this.saveState();

    // 7. Format preview object to match smart contract struct
    // uint8[5] toolIds; uint8[5] weights; uint8 forcedPolarity; uint64 decisionAt; uint64 scheduledFor; string prophecyHash;
    const toolIds: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const weights: [number, number, number, number, number] = [0, 0, 0, 0, 0];

    for (let i = 0; i < 5; i++) {
      if (i < candidates.length) {
        toolIds[i] = candidates[i].toolId;
        weights[i] = candidates[i].weight;
      }
    }

    const previewPolarity = forcedPol === 'evil' ? 0 : forcedPol === 'good' ? 1 : 2;
    const prophecyExcerpt = prophecyText.length > 200 ? prophecyText.substring(0, 197) + '...' : prophecyText;

    const preview: DemiurgePreview = {
      toolIds,
      weights,
      forcedPolarity: previewPolarity,
      decisionAt: BigInt(Math.floor(decisionAt / 1000)),
      scheduledFor: BigInt(Math.floor(scheduledFor / 1000)),
      prophecyHash: prophecyExcerpt
    };

    return preview;
  }

  /**
   * Checks if there's any scheduled divine tool execution and triggers it.
   */
  async checkAndExecute(currentDay: number): Promise<void> {
    if (!this.scheduledExecution) return;

    const now = Date.now();
    if (now >= this.scheduledExecution.executeAt) {
      const { toolId, day } = this.scheduledExecution;
      const tool = DIVINE_TOOLS.find(t => t.id === toolId)!;
      console.log(`\n🔥 Time reached to execute scheduled Divine Event: Tool ${toolId} (${tool.name})!`);

      try {
        // A. Apply to civilization engine
        const result = await this.civEngine.applyDivineTool(toolId);
        console.log(`Applied to CivEngine: ${result.description}`);

        // B. Record execution in balance tracker and cooldown manager
        this.balanceTracker.record(tool.polarity);
        this.cooldownManager.use(toolId, currentDay);

        // C. Log on-chain
        console.log(`Logging Divine Event on-chain to CivilizationLog...`);
        const txHash = await postDivineEventToChain(this.signer, this.civLogAddress, {
          toolId,
          polarity: tool.polarity === 'good' ? 1 : 0,
          executedAt: Math.floor(now / 1000),
          targetRegion: result.affectedRegions[0] !== undefined ? result.affectedRegions[0] : 255, // 255 = all
          magnitude: 500 // standard magnitude
        });
        console.log(`On-chain transaction hash: ${txHash}`);

        // Clear scheduled execution
        this.scheduledExecution = null;
        await this.saveState();
        
      } catch (err) {
        console.error("Failed to execute scheduled divine event:", err);
      }
    }
  }

  /**
   * Helper to write Demiurge preview on-chain.
   */
  async postPreviewToChain(preview: DemiurgePreview): Promise<string> {
    const contract = new ethers.Contract(this.civLogAddress, CIV_LOG_ABI, this.signer);
    const tx = await contract.postDemiurgePreview({
      toolIds: preview.toolIds,
      weights: preview.weights,
      forcedPolarity: preview.forcedPolarity,
      decisionAt: preview.decisionAt,
      scheduledFor: preview.scheduledFor,
      prophecyHash: preview.prophecyHash
    });
    const receipt = await tx.wait();
    return receipt.hash;
  }
  
  getScheduledExecution() {
    return this.scheduledExecution;
  }
}
