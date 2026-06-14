'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as Comlink from 'comlink';
import { usePublicClient, useReadContract, useAccount } from 'wagmi';

import { SimWorldState, SimEntity, SimRegion, SimDivineEvent } from '../../lib/simulation/types';
import { SimulationWorkerAPI } from '../../lib/simulation/worker';
import { CONTRACTS, CIVILIZATION_LOG_ABI, ORACLE_MESSAGE_ABI } from '../../lib/contracts';
import { fetchActiveDisciples, type HeroDisciple } from '../../lib/disciples';
import { formatUnits } from 'viem';

import DivineToolsPanel from '../../components/OracleWorld/DivineToolsPanel';
import ProphecyOverlay from '../../components/OracleWorld/ProphecyOverlay';
import EventLog from '../../components/OracleWorld/EventLog';
import BalanceIndicator from '../../components/OracleWorld/BalanceIndicator';
import EntityInfoCard from '../../components/OracleWorld/EntityInfoCard';
import PixelFrame from '../../components/PixelFrame';
import OnboardingOverlay from '../../components/OracleWorld/OnboardingOverlay';
import WorshipAltar from '../../components/WorshipAltar';

// Dynamically import WorldCanvas with SSR disabled to prevent PixiJS canvas initialization errors on server-side
const WorldCanvas = dynamic(
  () => import('../../components/OracleWorld/WorldCanvas'),
  { ssr: false }
);

// Standard Chiptune Synthesizer Audio Generator using Web Audio API
function playChiptuneSFX(isGood: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (isGood) {
      // Warm rising arpeggio for blessings
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
      freqs.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.08);
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.08 + 0.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + index * 0.08);
        osc.stop(audioCtx.currentTime + index * 0.08 + 0.2);
      });
    } else {
      // Deep ominous sweep for cataclysms
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    }
  } catch (err) {
    console.warn('Web Audio Context not permitted or supported yet:', err);
  }
}

export default function OracleWorldPage() {
  const [worldState, setWorldState] = useState<SimWorldState | null>(null);
  const [biomeGrid, setBiomeGrid] = useState<Uint8Array | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [visualEvents, setVisualEvents] = useState<SimDivineEvent[]>([]);

  // Hover details states
  const [hoveredEntity, setHoveredEntity] = useState<SimEntity | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<SimRegion | null>(null);
  const [hoveredDisciple, setHoveredDisciple] = useState<HeroDisciple | null>(null);

  // Hero NPCs derived from on-chain Disciples
  const [disciples, setDisciples] = useState<HeroDisciple[]>([]);

  // Weather selector — cycles none → rain → snow → none on click
  const [weather, setWeather] = useState<'none' | 'rain' | 'snow'>('none');
  const cycleWeather = () => setWeather(w => w === 'none' ? 'rain' : w === 'rain' ? 'snow' : 'none');

  // UI state toggles
  const [isMounted, setIsMounted] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProphecy, setShowProphecy] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [showDivinePanel, setShowDivinePanel] = useState(true);

  // Worker API references
  const workerApiRef = useRef<Comlink.Remote<SimulationWorkerAPI> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // On-Chain Synchronization States
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Proof of Worship — the player's own hero reacts in the world to the AI's verdict.
  const [strikeHero, setStrikeHero] = useState<{ tokenId: number; nonce: number } | null>(null);
  const [blessHero, setBlessHero] = useState<{ tokenId: number; nonce: number } | null>(null);
  const [focusHero, setFocusHero] = useState<{ tokenId: number; nonce: number } | null>(null);
  const [smiteVerdict, setSmiteVerdict] = useState<string | null>(null);
  const myHero = () =>
    address ? disciples.find((d) => d.address.toLowerCase() === address.toLowerCase()) : undefined;
  const onPrayerRejected = (verdict: string) => {
    const m = myHero();
    if (m) setStrikeHero({ tokenId: m.tokenId, nonce: Date.now() });
    setSmiteVerdict(verdict);
    setTimeout(() => setSmiteVerdict(null), 4500);
  };
  const onPrayerAccepted = () => {
    const m = myHero();
    if (m) setBlessHero({ tokenId: m.tokenId, nonce: Date.now() });
  };
  const findMyHero = () => {
    const m = myHero();
    if (m) setFocusHero({ tokenId: m.tokenId, nonce: Date.now() });
  };

  // Real on-chain prophecy (AI #1 Oracle) — replaces the old hardcoded placeholder.
  const { data: onChainProphecy } = useReadContract({
    address: CONTRACTS.oracleMessage,
    abi: ORACLE_MESSAGE_ABI,
    functionName: 'todaysProphecy',
    query: { enabled: !!CONTRACTS.oracleMessage },
  });
  const todaysProphecyText = (onChainProphecy as { text?: string } | undefined)?.text ?? '';

  const [balanceHistory, setBalanceHistory] = useState<('good' | 'evil')[]>(['good', 'evil', 'good', 'good', 'evil', 'evil', 'good', 'evil']);
  const [candidates, setCandidates] = useState<{ id: number; weight: number }[]>([]);
  const [onChainSnapshot, setOnChainSnapshot] = useState<any>(null);

  // Constants computed safely after mount
  const [dayIndex, setDayIndex] = useState(0);
  const [nextExecutionTime, setNextExecutionTime] = useState(0);

  // Bridge: track how many divine events we've already triggered visually,
  // so each new on-chain event applied by AI #3 fires the worker animation
  // exactly once. -1 = haven't polled yet (skip replay of pre-mount history).
  const lastSeenEventCountRef = useRef<number>(-1);

  useEffect(() => {
    setIsMounted(true);
    const d = Math.floor(Date.now() / 86400000);
    setDayIndex(d);
    setNextExecutionTime(d * 86400000 + 86400000);
    // First-visit onboarding for new users / judges landing cold on this page.
    try {
      if (!localStorage.getItem('oracle-world-onboarded-v1')) setShowOnboarding(true);
    } catch { /* SSR / privacy mode — skip */ }
  }, []);

  // Sync on-chain Demiurge parameters and historical balance from CivilizationLog
  useEffect(() => {
    if (dayIndex === 0) return;
    if (!publicClient || !CONTRACTS.civilizationLog) return;

    async function fetchOnChainData() {
      const client = publicClient;
      if (!client) return;

      try {
        // 1. Fetch latest preview (top-5 candidate tools & weights)
        const preview = await client.readContract({
          address: CONTRACTS.civilizationLog,
          abi: CIVILIZATION_LOG_ABI,
          functionName: 'getLatestPreview',
        }) as any;

        if (preview && preview.toolIds) {
          const parsedCandidates = [];
          for (let i = 0; i < 5; i++) {
            const toolId = Number(preview.toolIds[i]);
            const weight = Number(preview.weights[i]);
            // Filter out uninitialized / zero weight tools
            if (weight > 0) {
              parsedCandidates.push({ id: toolId, weight });
            }
          }
          // Sort descending by weight
          parsedCandidates.sort((a, b) => b.weight - a.weight);
          if (parsedCandidates.length > 0) {
            setCandidates(parsedCandidates);
          }
        }

        // 2. Fetch divine events count & last 10 events
        const eventCountBig = await client.readContract({
          address: CONTRACTS.civilizationLog,
          abi: CIVILIZATION_LOG_ABI,
          functionName: 'getDivineEventCount',
        }) as bigint;

        const eventCount = Number(eventCountBig);
        if (eventCount > 0) {
          const fetchPromises = [];
          const start = Math.max(0, eventCount - 10);
          for (let i = start; i < eventCount; i++) {
            fetchPromises.push(
              client.readContract({
                address: CONTRACTS.civilizationLog,
                abi: CIVILIZATION_LOG_ABI,
                functionName: 'getDivineEvent',
                args: [BigInt(i)],
              })
            );
          }

          const results = await Promise.all(fetchPromises) as any[];
          const history: ('good' | 'evil')[] = results.map(ev => {
            // polarity: 0 = evil, 1 = good in smart contract
            return Number(ev.polarity) === 1 ? 'good' : 'evil';
          });
          setBalanceHistory(history);

          // ── BRIDGE: replay only events newer than what we've already shown ──
          const lastSeen = lastSeenEventCountRef.current;
          if (lastSeen === -1) {
            // First poll of this session — adopt current count, do not replay
            // historical events visually.
            lastSeenEventCountRef.current = eventCount;
          } else if (eventCount > lastSeen) {
            const api = workerApiRef.current;
            const activeRegions = worldState?.regions.filter(r => r.isActive) ?? [];
            const newCount = eventCount - lastSeen;
            // The results array holds the last 10; pick the tail = newest events
            const newEvents = results.slice(Math.max(0, results.length - newCount));
            for (const ev of newEvents) {
              const toolId = Number(ev.toolId);
              const targetRegionByte = Number(ev.targetRegion);
              let regionId = -1;
              if (activeRegions.length > 0) {
                if (targetRegionByte !== 255 && targetRegionByte < activeRegions.length) {
                  regionId = activeRegions[targetRegionByte].id;
                } else {
                  regionId = activeRegions[Math.floor(Math.random() * activeRegions.length)].id;
                }
              }
              if (api && regionId >= 0) {
                try {
                  await api.triggerDivineTool(toolId, regionId);
                } catch (err) {
                  console.warn('Failed to dispatch on-chain divine tool to worker:', err);
                }
              }
            }
            lastSeenEventCountRef.current = eventCount;
          }
        } else {
          // No events yet — keep the bridge cursor at 0 so the next event triggers
          if (lastSeenEventCountRef.current === -1) lastSeenEventCountRef.current = 0;
        }

        // 3. Fetch snapshot for today
        const snap = await client.readContract({
          address: CONTRACTS.civilizationLog,
          abi: CIVILIZATION_LOG_ABI,
          functionName: 'getSnapshot',
          args: [BigInt(dayIndex)],
        }) as any;
        
        if (snap && snap.snapshotAt > 0n) {
          setOnChainSnapshot(snap);
          // Bridge: drive the live world toward the verifiable on-chain civilization.
          workerApiRef.current?.applyCivSnapshot({
            totalPopulation: Number(snap.totalPopulation),
            dominantFaction: Number(snap.dominantFaction),
            activeRegions: Number(snap.activeRegions),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to sync with on-chain CivilizationLog contract:', err);
      }
    }

    fetchOnChainData();
    // Poll contract state every 15 seconds to keep dashboard updated in real-time
    const interval = setInterval(fetchOnChainData, 15000);
    return () => clearInterval(interval);
  }, [publicClient, dayIndex]);

  // Set up and initialize Comlink Web Worker
  useEffect(() => {
    if (dayIndex === 0) return;

    // 1. Instantiate the background Web Worker thread using module import syntax
    const worker = new Worker(
      new URL('../../lib/simulation/worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    // 2. Wrap worker thread with Comlink
    const api = Comlink.wrap<SimulationWorkerAPI>(worker);
    workerApiRef.current = api;

    async function setupSimulation() {
      // Initialize the ECS world state in worker
      const initialState = await api.initialize(dayIndex);
      setWorldState(initialState);

      // Fetch static heightmap tile biomes
      const grid = await api.getBiomeGrid();
      setBiomeGrid(grid);

      // 3. Start high-frequency tick loop and proxy the state update callback
      await api.startLoop(
        Comlink.proxy((update) => {
          setWorldState(update.state);
          setEvents(update.events);
        })
      );
    }

    setupSimulation();

    return () => {
      if (workerApiRef.current) {
        workerApiRef.current.stopLoop();
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [dayIndex]);

  // Poll TempleVault for active Disciples → render as HERO NPCs in the
  // simulator. Refresh every 30 s so newly-staked wallets show up live.
  useEffect(() => {
    if (!publicClient || !CONTRACTS.templeVault || !biomeGrid) return;
    let cancelled = false;
    async function poll() {
      try {
        const list = await fetchActiveDisciples(
          publicClient!,
          CONTRACTS.templeVault,
          biomeGrid,
        );
        if (!cancelled) setDisciples(list);
      } catch (err) {
        console.warn('Disciple fetch failed:', err);
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [publicClient, biomeGrid]);

  // Periodically check for divine visual animations from worker
  useEffect(() => {
    const api = workerApiRef.current;
    if (!api) return;

    const interval = setInterval(async () => {
      const pendingVisuals = await api.consumeVisualEvents();
      if (pendingVisuals.length > 0) {
        setVisualEvents(pendingVisuals);
        
        // Trigger chiptune audio synthesizer depending on first visual event
        const polarity = pendingVisuals[0].polarity === 'good';
        playChiptuneSFX(polarity);
      } else {
        setVisualEvents([]);
      }
    }, 500); // Check twice a second

    return () => clearInterval(interval);
  }, [worldState?.lastUpdatedAt]);

  // Direct Button trigger for interactive play-testing
  const handleTriggerTool = async (toolId: number) => {
    const api = workerApiRef.current;
    if (!api || !worldState) return;

    // Trigger tool on a random region
    const active = worldState.regions.filter(r => r.isActive);
    if (active.length === 0) return;
    const target = active[Math.floor(Math.random() * active.length)];

    await api.triggerDivineTool(toolId, target.id);
  };

  if (!isMounted || dayIndex === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#07070c] text-[#39ff14] font-mono select-none">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-15 z-50" />
        <div className="flex flex-col items-center max-w-md p-6 text-center border-4 border-[#3a2f1b] bg-[#121622] rounded shadow-2xl relative">
          <div className="absolute inset-1 pointer-events-none border border-[#b89c30]/20" />
          <div className="text-4xl animate-bounce mb-4">🏛️</div>
          <h2 className="text-xs font-bold font-sans text-[#b89c30] tracking-widest uppercase mb-2">
            ALIGNING COSMIC SYNC
          </h2>
          <div className="w-48 h-3 bg-[#0a0d14] border border-[#3a2f1b] rounded overflow-hidden p-0.5 mb-4">
            <div className="h-full bg-[#39ff14] animate-[pulse_1s_infinite] w-3/4" />
          </div>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest leading-relaxed">
            CONNECTING TO DECOUPLED ORACLE SENSOR NETWORKS...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#07070c] text-stone-200 select-none font-mono overflow-hidden">
      <OnboardingOverlay
        open={showOnboarding}
        onClose={() => {
          try { localStorage.setItem('oracle-world-onboarded-v1', '1'); } catch { /* ignore */ }
          setShowOnboarding(false);
        }}
      />
      {/* Decorative CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-10" />

      {/* World Canvas Visualizer at background (z-0) */}
      {/* Faction tint — the world's colour reflects the on-chain dominant faction. */}
      {onChainSnapshot && (
        <div
          className="absolute inset-0 pointer-events-none z-[1] transition-colors duration-1000"
          style={{
            backgroundColor:
              Number(onChainSnapshot.dominantFaction) === 0 ? '#3aa0ff'
                : Number(onChainSnapshot.dominantFaction) === 1 ? '#ff3355'
                  : '#39ff14',
            opacity: 0.07,
            mixBlendMode: 'overlay',
          }}
        />
      )}
      <WorldCanvas
        worker={workerRef.current}
        workerApi={workerApiRef.current}
        worldState={worldState}
        biomeGrid={biomeGrid}
        visualEvents={visualEvents}
        disciples={disciples}
        strikeHero={strikeHero}
        blessHero={blessHero}
        focusHero={focusHero}
        weather={weather}
        onHoverEntity={setHoveredEntity}
        onHoverRegion={setHoveredRegion}
        onHoverDisciple={setHoveredDisciple}
      />

      {smiteVerdict && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-[#1a0a12]/95 border-2 border-[#ff0055] rounded px-5 py-3 shadow-[0_0_30px_rgba(255,0,85,0.5)] text-center animate-[pulse_0.5s_ease-out_2]">
            <div className="text-[#ff0055] font-bold text-[12px] uppercase tracking-widest font-mono">⚡ The Demiurge Strikes</div>
            <div className="text-stone-300 text-[10px] italic font-mono mt-1 max-w-xs">&ldquo;{smiteVerdict}&rdquo;</div>
          </div>
        </div>
      )}

      {/* Floating hover card for a hero Disciple — viral share moment */}
      {hoveredDisciple && (
        <div className="absolute top-32 right-6 z-30 pointer-events-none">
          <div className="bg-[#0a0d14]/95 border-2 border-[#ffd86b] rounded-md p-3 shadow-[0_0_24px_rgba(255,216,107,0.35)] min-w-[220px]">
            <div className="text-[8px] text-[#ffd86b] uppercase tracking-widest mb-1">
              ⚜ HERO OF THE TEMPLE
            </div>
            <div className="text-[12px] font-bold text-[#ffe066] mb-2 leading-tight">
              {hoveredDisciple.name}
            </div>
            <div className="text-[9px] text-stone-400 font-mono mb-1">
              token #{hoveredDisciple.tokenId} · {hoveredDisciple.address.slice(0, 6)}…{hoveredDisciple.address.slice(-4)}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-stone-300 font-mono mt-2">
              <span className="text-stone-500">faith staked</span>
              <span className="text-right text-[#39ff14]">{formatUnits(hoveredDisciple.stake, 6)} USDY</span>
              <span className="text-stone-500">karma</span>
              <span className="text-right">{hoveredDisciple.karma}</span>
              <span className="text-stone-500">faction</span>
              <span className="text-right">{hoveredDisciple.race === 1 ? 'believer' : hoveredDisciple.race === 2 ? 'apostate' : 'wanderer'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main HUD overlay layer (z-10) with pointer-events-none */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 md:p-6">
        
        {/* TOP ROW HUD - Banner & Quick Toggles */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 w-full pointer-events-auto">
          <div className="flex items-center gap-3">
            <PixelFrame className="p-3 bg-[#101423]/95" thickness={2}>
              <div className="flex flex-col">
                <h1 className="text-[11px] font-bold tracking-widest text-[#b89c30] font-sans uppercase">
                  🏛️ THE ORACLE CIVILIZATION
                </h1>
                <p className="text-[8px] text-[#00ffff] font-mono tracking-wider mt-0.5 uppercase">
                  DECOUPLED 3-AI AUTONOMOUS GAME LAYER
                </p>
              </div>
            </PixelFrame>
            
            <a 
              href="/"
              className="pointer-events-auto active:translate-y-0.5 transition-all"
            >
              <PixelFrame className="bg-[#16213e]/90 px-3 py-1.5 text-[9px] text-[#b89c30] font-bold tracking-widest" thickness={2}>
                ◀ BACK TO TEMPLE
              </PixelFrame>
            </a>
          </div>

          {/* Center Cosmic Alignment bar */}
          <div className="flex-1 max-w-xs md:max-w-md w-full">
            <BalanceIndicator balanceHistory={balanceHistory} />
          </div>

          {/* Quick HUD Toggles */}
          <div className="flex flex-wrap justify-center md:justify-end gap-2">
            <button 
              onClick={() => setShowProphecy(p => !p)}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
            >
              <PixelFrame className={`${showProphecy ? 'bg-[#39ff14]/10 text-[#39ff14]' : 'bg-[#0f1118]/80 text-stone-500'} px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase`} thickness={2}>
                📜 PROPHECY
              </PixelFrame>
            </button>
            <button 
              onClick={() => setShowLogs(p => !p)}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
            >
              <PixelFrame className={`${showLogs ? 'bg-[#39ff14]/10 text-[#39ff14]' : 'bg-[#0f1118]/80 text-stone-500'} px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase`} thickness={2}>
                📋 LOGS
              </PixelFrame>
            </button>
            <button 
              onClick={() => setShowDivinePanel(p => !p)}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
            >
              <PixelFrame className={`${showDivinePanel ? 'bg-[#39ff14]/10 text-[#39ff14]' : 'bg-[#0f1118]/80 text-stone-500'} px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase`} thickness={2}>
                🔮 DEMIURGE
              </PixelFrame>
            </button>
            <button
              onClick={cycleWeather}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
              title="Cycle weather: clear → rain → snow"
            >
              <PixelFrame className={`${weather !== 'none' ? 'bg-[#00ffff]/10 text-[#00ffff]' : 'bg-[#0f1118]/80 text-stone-500'} px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase`} thickness={2}>
                {weather === 'rain' ? '🌧️ RAIN' : weather === 'snow' ? '❄️ SNOW' : '☀️ CLEAR'}
              </PixelFrame>
            </button>
            <button
              onClick={() => setShowSandbox(p => !p)}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
            >
              <PixelFrame className={`${showSandbox ? 'bg-[#ff00ff]/10 text-[#ff00ff] animate-pulse' : 'bg-[#0f1118]/80 text-stone-500'} px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase`} thickness={2}>
                🛠️ SANDBOX
              </PixelFrame>
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
              aria-label="How it works"
            >
              <PixelFrame className="bg-[#0f1118]/80 text-[#b89c30] hover:text-[#ffd86b] px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase" thickness={2}>
                ❔ HELP
              </PixelFrame>
            </button>
            <button
              onClick={findMyHero}
              className="pointer-events-auto active:translate-y-0.5 transition-all cursor-pointer"
              aria-label="Find my hero"
            >
              <PixelFrame className="bg-[#16213e]/90 text-[#ffd86b] hover:text-[#ffe066] px-2.5 py-1.5 text-[9px] font-bold tracking-widest uppercase" thickness={2}>
                ⚜ FIND MY HERO
              </PixelFrame>
            </button>
          </div>
        </header>

        {/* MIDDLE / LOWER DOCKING ROW */}
        <div className="flex-1 flex justify-between gap-2 md:gap-6 items-end mt-4 w-full h-[calc(100%-80px)] pointer-events-none">
          
          {/* LEFT SIDEBAR HUD - Prophecy & Event Log */}
          <div className="flex flex-col gap-4 w-[46vw] max-w-[20rem] md:w-80 min-w-0 pointer-events-auto h-full justify-end max-h-[85%]">
            <WorshipAltar onRejected={onPrayerRejected} onAccepted={onPrayerAccepted} closeOnReject />
            {showProphecy && (
              <div className="transition-all duration-300">
                <ProphecyOverlay
                  dayIndex={worldState?.day || dayIndex}
                  prophecyText={todaysProphecyText}
                />
              </div>
            )}
            
            {showLogs && (
              <div className="transition-all duration-300">
                <EventLog events={events} />
              </div>
            )}
          </div>

          {/* CENTER BOTTOM - Interactive Info Card Tooltip */}
          <div className="hidden md:flex pointer-events-auto w-96 flex-col justify-end max-h-[85%] self-end">
            <EntityInfoCard
              hoveredEntity={hoveredEntity}
              hoveredRegion={hoveredRegion}
            />
          </div>

          {/* RIGHT SIDEBAR HUD - Divine Tools Panel */}
          <div className="w-[46vw] max-w-[20rem] md:w-80 min-w-0 pointer-events-auto h-full flex flex-col justify-end items-end max-h-[85%]">
            {showDivinePanel && (
              <div className="transition-all duration-300 w-full">
                <DivineToolsPanel
                  candidates={candidates}
                  lastExecutedToolId={visualEvents.length > 0 ? visualEvents[0].toolId : null}
                  balanceHistory={balanceHistory}
                  nextExecutionTime={nextExecutionTime}
                />
              </div>
            )}
          </div>

        </div>

      </div>

      {/* FLOATING DEVELOPER SANDBOX MODAL (z-30) */}
      {showSandbox && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl p-2 pointer-events-auto">
          <PixelFrame className="bg-[#121622]/95 p-4" thickness={3}>
            <div className="flex justify-between items-center mb-3 border-b border-[#b89c30]/20 pb-1.5 uppercase font-bold text-[10px] text-[#b89c30]">
              <span className="flex items-center gap-1.5">🛠️ DEMIURGE terminal bypass (DEV MODE)</span>
              <button 
                onClick={() => setShowSandbox(false)}
                className="text-[#ff0055] hover:text-[#ff3377] font-bold text-xs cursor-pointer"
              >
                [X] CLOSE
              </button>
            </div>
            <p className="text-stone-400 text-[10px] leading-relaxed mb-3">
              Trigger any of the 10 divine events below to witness real-time ECS structural migrations, battle conflicts, and visual shaders directly in the world simulation.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={() => handleTriggerTool(0)}
                className="px-3 py-2 bg-[#39ff14]/10 hover:bg-[#39ff14]/25 border border-[#39ff14]/40 text-[#39ff14] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                🌟 CAST BLESSING RAIN
              </button>
              <button 
                onClick={() => handleTriggerTool(2)}
                className="px-3 py-2 bg-[#39ff14]/10 hover:bg-[#39ff14]/25 border border-[#39ff14]/40 text-[#39ff14] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                🌟 SPAWN MISSIONARIES
              </button>
              <button 
                onClick={() => handleTriggerTool(3)}
                className="px-3 py-2 bg-[#39ff14]/10 hover:bg-[#39ff14]/25 border border-[#39ff14]/40 text-[#39ff14] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                🌟 FOUND SETTLEMENT
              </button>
              <button 
                onClick={() => handleTriggerTool(5)}
                className="px-3 py-2 bg-[#ff0055]/10 hover:bg-[#ff0055]/25 border border-[#ff0055]/40 text-[#ff0055] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                ⚡ LAUNCH METEOR STRIKE
              </button>
              <button 
                onClick={() => handleTriggerTool(6)}
                className="px-3 py-2 bg-[#ff0055]/10 hover:bg-[#ff0055]/25 border border-[#ff0055]/40 text-[#ff0055] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                ⚡ SPREAD PLAGUE WAVE
              </button>
              <button 
                onClick={() => handleTriggerTool(9)}
                className="px-3 py-2 bg-[#ff0055]/10 hover:bg-[#ff0055]/25 border border-[#ff0055]/40 text-[#ff0055] font-bold rounded cursor-pointer transition-all active:translate-y-0.5 text-[9px] uppercase tracking-wider"
              >
                ⚡ WHISPER APOSTASY
              </button>
            </div>
          </PixelFrame>
        </div>
      )}
    </div>
  );
}
