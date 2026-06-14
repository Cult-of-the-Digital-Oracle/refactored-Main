'use client';

// WorldCanvas — Continent-scale PixiJS renderer.
// Strategy:
//  - Map: ONE upscaled sprite built from a 1024×1024 biome-color ImageData.
//  - Biome tile overlay: enabled at zoom ≥ 1.5, viewport-culled, pooled.
//  - ALL world objects (trees, grass, props, buildings, units) share one
//    sortable layer. zIndex = feet Y → proper 2.5D occlusion (an NPC behind
//    a castle wall gets hidden by the wall instead of standing on the roof).
//  - Render data flows in via raw `RENDER_FRAME` postMessage (zero-copy).

import React, { useEffect, useRef, useState } from 'react';
import {
  Application, Container, Sprite, Texture, Graphics, Text,
} from 'pixi.js';
import type { Remote } from 'comlink';
import type { HeroDisciple } from '../../lib/disciples';

import {
  ensureAtlasesLoaded, getTexture, frameForEntityType,
  frameForBuilding, buildingScale, unitScaleMultiplier,
  TREE_FRAMES, DEAD_TREE_FRAMES, GRASS_FRAMES, VFX,
  ENV_SCALE, projectileFor, PROP_FRAMES, frameForBiome,
} from '../../lib/simulation/atlas-loader';
import type { SimulationWorkerAPI } from '../../lib/simulation/worker';
import {
  WORLD_TILES, WORLD_PX, TILE_PX, ACTION, BIOME,
  type SimWorldState, type SimEntity, type SimRegion, type SimDivineEvent,
} from '../../lib/simulation/types';

interface WorldCanvasProps {
  worker: Worker | null;
  workerApi: Remote<SimulationWorkerAPI> | null;
  worldState: SimWorldState | null;
  biomeGrid: Uint8Array | null;
  visualEvents: SimDivineEvent[];
  disciples: HeroDisciple[];
  // When this nonce changes, smite the given hero (by tokenId) with lightning.
  strikeHero?: { tokenId: number; nonce: number } | null;
  weather: 'none' | 'rain' | 'snow';
  onHoverEntity: (entity: SimEntity | null) => void;
  onHoverRegion: (region: SimRegion | null) => void;
  onHoverDisciple: (d: HeroDisciple | null) => void;
}

interface RenderFrameData {
  type: 'RENDER_FRAME';
  positions: Float32Array;
  velocities: Float32Array;
  types: Uint8Array;
  states: Uint8Array;
  count: number;
  bPositions: Float32Array;
  bRaces: Uint8Array;
  bSubTypes: Uint8Array;
  bAges: Uint16Array;
  bCount: number;
  boatPositions: Float32Array;
  boatVelocities: Float32Array;
  boatCount: number;
}

// Biome colors used to bake the map color sprite.
// Tuned so the ocean reads as a real ocean (not void) — the canvas bg is near-black
// and the deep sea must be visibly distinct from it.
const BIOME_RGBA: Record<number, [number, number, number, number]> = {
  [BIOME.DEEP_SEA]:     [32, 64, 110, 255],
  [BIOME.SHALLOW_SEA]:  [62, 116, 178, 255],
  [BIOME.SAND]:         [221, 192, 124, 255],
  [BIOME.GRASS]:        [88, 175, 92, 255],
  [BIOME.FOREST]:       [36, 110, 60, 255],
  [BIOME.MOUNTAIN]:     [130, 122, 116, 255],
  [BIOME.SNOW]:         [232, 240, 245, 255],
};

export default function WorldCanvas(props: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const mapLayerRef = useRef<Container | null>(null);
  const tileOverlayLayerRef = useRef<Container | null>(null);
  // Trees, grass, props, buildings AND units all live in this one layer so PIXI
  // can depth-sort them by per-sprite zIndex = feet Y. Otherwise an NPC behind a
  // castle would render on top of the castle's roof.
  const objectsLayerRef = useRef<Container | null>(null);
  const vfxLayerRef = useRef<Container | null>(null);

  // sprite pools (idx → sprite, reused across frames)
  const unitSpritesRef = useRef<Sprite[]>([]);
  const buildingSpritesRef = useRef<Sprite[]>([]);
  const boatSpritesRef = useRef<Sprite[]>([]);
  const tilePoolRef = useRef<Sprite[]>([]);

  // Water shimmer particles (white ripples on shallow_sea)
  const wavesRef = useRef<Array<{ g: Graphics; life: number; max: number }>>([]);

  // Full-screen day/night tint overlay (added to app.stage so it doesn't pan with camera)
  const dayNightOverlayRef = useRef<Graphics | null>(null);

  // Weather particles (rain/snow). Pool of sprite + velocity records.
  const weatherParticlesRef = useRef<Array<{ s: Sprite; vx: number; vy: number; sway: number }>>([]);

  // Hero NPCs (Disciple wallets) — keyed by tokenId so adds/removes are cheap
  const heroSpritesRef = useRef<Map<number, { sprite: Sprite; glow: Graphics; label: Text; data: HeroDisciple }>>(new Map());

  // projectile VFX (small short-lived sprites flying from attackers)
  const projectilesRef = useRef<Array<{ s: Sprite; vx: number; vy: number; life: number }>>([]);

  // biome grid cached for tile overlay
  const biomeGridRef = useRef<Uint8Array | null>(null);

  // latest render frame buffer
  const frameRef = useRef<RenderFrameData | null>(null);

  // mounted-once env state (don't re-render every prop change)
  const envSeededRef = useRef(false);

  // App readiness gate — biome bake / env seed must wait for PIXI init
  const [appReady, setAppReady] = useState(false);

  // input state
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const hoverPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. INIT PIXI APP
  useEffect(() => {
    let cancelled = false;
    let app: Application | null = null;

    (async () => {
      await ensureAtlasesLoaded();
      if (cancelled) return;

      app = new Application();
      await app.init({
        resizeTo: window,
        // Deep abyss — matches the deep-sea biome so map edges blend into "ocean
        // beyond the continent" rather than a void.
        backgroundColor: 0x102045,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: 'webgl',
      });
      if (cancelled) { app.destroy(true, { children: true, texture: false }); return; }

      const canvas = app.canvas;
      canvas.style.imageRendering = 'pixelated';
      hostRef.current?.appendChild(canvas);
      appRef.current = app;

      const worldContainer = new Container();
      worldContainer.sortableChildren = true;
      const mapLayer = new Container();         mapLayer.zIndex = 0;
      const tileOverlayLayer = new Container(); tileOverlayLayer.zIndex = 5;
      // Unified depth-sorted layer: every world object (tree/grass/prop/
      // building/NPC) sorts by per-sprite zIndex = feet Y. This yields proper
      // 2.5D occlusion (NPCs behind a wall get hidden by the wall).
      const objectsLayer = new Container();     objectsLayer.zIndex = 20;
      objectsLayer.sortableChildren = true;
      const vfxLayer = new Container();         vfxLayer.zIndex = 100;

      worldContainer.addChild(mapLayer, tileOverlayLayer, objectsLayer, vfxLayer);
      app.stage.addChild(worldContainer);
      worldContainerRef.current = worldContainer;
      mapLayerRef.current = mapLayer;
      tileOverlayLayerRef.current = tileOverlayLayer;
      objectsLayerRef.current = objectsLayer;
      vfxLayerRef.current = vfxLayer;

      // Initial camera: focus on the world center at a zoom that shows
      // enough detail to read individual entities while still hinting at the
      // continent scale. User can wheel-zoom out to see the full map.
      const initialScale = 0.35;
      worldContainer.scale.set(initialScale);
      worldContainer.x = window.innerWidth / 2 - (WORLD_PX / 2) * initialScale;
      worldContainer.y = window.innerHeight / 2 - (WORLD_PX / 2) * initialScale;

      // Day/night tint overlay — sits on stage above world container, below
      // any HUD (HUD is DOM-positioned outside the canvas so unaffected).
      const dayNight = new Graphics();
      dayNight.eventMode = 'none';
      app.stage.addChild(dayNight);
      dayNightOverlayRef.current = dayNight;

      // Per-frame render loop
      app.ticker.add(renderTick);

      // Input handlers
      attachInput(app);

      // Signal downstream effects (biome bake, env seed) that they may proceed
      setAppReady(true);
    })();

    return () => {
      cancelled = true;
      if (app) {
        try { app.destroy(true, { children: true, texture: false }); } catch {}
      }
      appRef.current = null;
      worldContainerRef.current = null;
      unitSpritesRef.current = [];
      buildingSpritesRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. ATTACH RENDER_FRAME LISTENER
  useEffect(() => {
    const w = props.worker;
    if (!w) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'RENDER_FRAME') {
        frameRef.current = e.data as RenderFrameData;
      }
    };
    w.addEventListener('message', handler);
    return () => w.removeEventListener('message', handler);
  }, [props.worker]);

  // 3. BAKE THE MAP COLOR SPRITE WHEN biomeGrid ARRIVES (and PIXI app ready)
  useEffect(() => {
    if (!props.biomeGrid || !appReady || !mapLayerRef.current) return;
    biomeGridRef.current = props.biomeGrid;
    const grid = props.biomeGrid;
    const layer = mapLayerRef.current;

    // Remove previous
    layer.removeChildren();

    const canvas = document.createElement('canvas');
    canvas.width = WORLD_TILES;
    canvas.height = WORLD_TILES;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(WORLD_TILES, WORLD_TILES);
    const data = img.data;
    for (let i = 0; i < grid.length; i++) {
      const c = BIOME_RGBA[grid[i]] ?? BIOME_RGBA[BIOME.GRASS];
      const o = i * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = c[3];
    }
    ctx.putImageData(img, 0, 0);

    const tex = Texture.from(canvas);
    tex.source.scaleMode = 'nearest';
    const sprite = new Sprite(tex);
    sprite.scale.set(TILE_PX, TILE_PX);
    layer.addChild(sprite);
  }, [props.biomeGrid, appReady]);

  // 4. FETCH TREES + GRASS ONCE (when worker ready & atlases loaded)
  useEffect(() => {
    if (envSeededRef.current) return;
    if (!props.workerApi || !appReady || !objectsLayerRef.current) return;

    let cancelled = false;
    (async () => {
      await ensureAtlasesLoaded();
      if (cancelled || envSeededRef.current) return;
      const seed = await props.workerApi!.getTreesAndGrass() as { trees: any[]; grass: any[]; props: any[] };
      const trees = seed.trees ?? [];
      const grass = seed.grass ?? [];
      const propsList = seed.props ?? [];
      if (cancelled || envSeededRef.current) return;
      const objects = objectsLayerRef.current!;

      // Audited proportions: great_hall > castle > tower > tree > hut > NPC > campfire > grass
      // zIndex = feet Y so depth-sorting handles occlusion (NPC behind a tree
      // gets hidden by the tree's foliage).
      for (const g of grass) {
        const tex = getTexture(GRASS_FRAMES[g.variant % GRASS_FRAMES.length]);
        const s = new Sprite(tex);
        s.anchor.set(0.5, 0.9);
        s.x = g.x; s.y = g.y;
        s.zIndex = g.y;
        s.scale.set(ENV_SCALE.GRASS);
        objects.addChild(s);
      }
      for (const t of trees) {
        const frames = t.dead ? DEAD_TREE_FRAMES : TREE_FRAMES;
        const tex = getTexture(frames[t.variant % frames.length]);
        const s = new Sprite(tex);
        s.anchor.set(0.5, 0.92);
        s.x = t.x; s.y = t.y;
        s.zIndex = t.y;
        s.scale.set(t.dead ? ENV_SCALE.TREE_DEAD : ENV_SCALE.TREE_LIVING);
        objects.addChild(s);
      }
      // Coast props — docks anchor at bottom (boats are dynamic now,
      // spawned & ticked by the worker)
      for (const p of propsList) {
        if (p.kind === 'boat') continue;
        const frame = p.variant === 0 ? PROP_FRAMES.DOCK_1 : PROP_FRAMES.DOCK_2;
        const s = new Sprite(getTexture(frame));
        s.anchor.set(0.5, 0.85);
        s.x = p.x; s.y = p.y;
        s.zIndex = p.y;
        s.scale.set(ENV_SCALE.DOCK);
        objects.addChild(s);
      }
      envSeededRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [props.workerApi, appReady]);

  // 4b. SYNC HERO DISCIPLE SPRITES — fires whenever the props.disciples array
  // changes (typically every 30 s when page.tsx re-polls TempleVault). Adds
  // sprites for new wallets, removes sprites for exited ones, updates positions
  // for any that moved (shouldn't happen since position is deterministic).
  useEffect(() => {
    if (!appReady || !objectsLayerRef.current) return;
    const objects = objectsLayerRef.current;
    const current = heroSpritesRef.current;
    const incoming = new Map<number, HeroDisciple>();
    for (const d of props.disciples) incoming.set(d.tokenId, d);

    // Remove sprites no longer in the active set
    for (const [tokenId, rec] of current) {
      if (!incoming.has(tokenId)) {
        rec.sprite.destroy();
        rec.glow.destroy();
        rec.label.destroy();
        current.delete(tokenId);
      }
    }

    // Add / update
    for (const d of props.disciples) {
      let rec = current.get(d.tokenId);
      if (!rec) {
        const sprite = new Sprite();
        sprite.anchor.set(0.5, 0.85);
        const glow = new Graphics();
        glow.circle(0, 0, 18).fill({ color: 0xffd86b, alpha: 0.18 });
        const label = new Text({
          text: d.name,
          style: {
            fontFamily: 'Press Start 2P, monospace',
            fontSize: 6,
            fill: 0xffe066,
            stroke: { color: 0x000000, width: 2 },
            align: 'center',
          },
        });
        label.anchor.set(0.5, 1.6);
        label.resolution = 2; // crisper at zoom-in
        objects.addChild(glow, sprite, label);
        rec = { sprite, glow, label, data: d };
        current.set(d.tokenId, rec);
      } else {
        rec.data = d;
        if (rec.label.text !== d.name) rec.label.text = d.name;
      }
      // Texture is the regular faction NPC sprite; the glow + label + scale
      // bump are what makes a hero feel special.
      const type = d.race * 10 + d.subType;
      rec.sprite.texture = getTexture(frameForEntityType(type));
      rec.sprite.x = d.x;
      rec.sprite.y = d.y;
      rec.sprite.zIndex = d.y + 0.5;
      rec.glow.x = d.x;
      rec.glow.y = d.y - 8;
      rec.glow.zIndex = d.y - 0.5; // sit behind sprite
      rec.label.x = d.x;
      rec.label.y = d.y;
      rec.label.zIndex = d.y + 1;
    }
  }, [props.disciples, appReady]);

  // 5. VFX FROM visualEvents (meteor strike, etc)
  useEffect(() => {
    if (!props.visualEvents.length || !appRef.current || !vfxLayerRef.current) return;
    for (const ev of props.visualEvents) {
      // Find the targeted region's world position
      const region = props.worldState?.regions.find(r => r.id === ev.targetRegionId);
      if (!region) continue;
      if (ev.toolId === 5) animateMeteor(region.x, region.y);
      else if (ev.toolId === 0 || ev.toolId === 4) animateBlessing(region.x, region.y);
      else if (ev.toolId === 6 || ev.toolId === 8) animatePlague(region.x, region.y);
      else animateFlash(region.x, region.y, ev.polarity === 'good' ? 0x39ff14 : 0xff0055);
    }
  }, [props.visualEvents]);

  // 5b. PROOF OF WORSHIP — the Demiurge smites an unworthy disciple's hero with a
  // localized lightning strike (fired from a rejected prayer in the HUD).
  useEffect(() => {
    const s = props.strikeHero;
    if (!s || !appReady) return;
    const rec = heroSpritesRef.current.get(s.tokenId);
    if (!rec || rec.sprite.destroyed) return;
    animateLightning(rec.sprite.x, rec.sprite.y);
    rec.sprite.tint = 0x335577; // charred
    const t = setTimeout(() => {
      const r = heroSpritesRef.current.get(s.tokenId);
      if (r && !r.sprite.destroyed) r.sprite.tint = 0xffffff;
    }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.strikeHero?.nonce, appReady]);

  // ------ RENDER TICK -----------
  function renderTick() {
    const app = appRef.current;
    const world = worldContainerRef.current;
    const objects = objectsLayerRef.current;
    const frame = frameRef.current;
    if (!app || !world || !objects || !frame) return;

    const now = performance.now();
    const scale = world.scale.x;
    const wx = world.x, wy = world.y;
    const W = window.innerWidth, H = window.innerHeight;
    const margin = 96;
    const vL = (-wx - margin) / scale;
    const vR = (-wx + W + margin) / scale;
    const vT = (-wy - margin) / scale;
    const vB = (-wy + H + margin) / scale;

    // LOD tier
    const tier = scale >= 0.7 ? 2 : scale >= 0.3 ? 1 : 0;
    // Base NPC scale is intentionally small so people read as ants compared
    // to buildings and trees. At very low zoom we boost slightly to keep them
    // visible, but never larger than a small building.
    const unitBaseScale = 0.16;
    const unitSpriteScale = tier === 0 ? Math.min(0.45, 0.06 / scale) : unitBaseScale;

    // Biome tile overlay — adds biome-textured tiles in viewport at close zoom
    updateBiomeOverlay(vL, vR, vT, vB, scale);

    // Day/night cycle tint
    updateDayNightOverlay(now);

    // Weather particles (rain / snow)
    updateWeather(now, vL, vR, vT, vB);

    // Animate active projectiles
    updateProjectiles();

    // -------- UNITS --------
    const pool = unitSpritesRef.current;
    const count = frame.count;
    const positions = frame.positions;
    const velocities = frame.velocities;
    const types = frame.types;
    const states = frame.states;

    let renderedUnits = 0;
    for (let i = 0; i < count; i++) {
      const x = positions[i * 2];
      const y = positions[i * 2 + 1];
      const inView = x >= vL && x <= vR && y >= vT && y <= vB;

      let s = pool[renderedUnits];
      if (!s) {
        s = new Sprite();
        s.anchor.set(0.5, 0.85);
        objects.addChild(s);
        pool[renderedUnits] = s;
      }

      if (!inView) {
        s.visible = false;
        renderedUnits++;
        continue;
      }

      const type = types[i];
      const state = states[i];
      const vx = velocities[i * 2];
      const race = (type / 10) | 0;

      s.texture = getTexture(frameForEntityType(type));
      s.x = x;
      s.y = y;
      s.zIndex = y;
      s.visible = true;
      s.tint = 0xffffff;

      // Flip by velocity direction + per-class size adjustment
      const flipped = vx < -0.1;
      const mul = unitScaleMultiplier(type);
      const finalScale = unitSpriteScale * mul;
      s.scale.x = flipped ? -finalScale : finalScale;
      s.scale.y = finalScale;

      // LOD 0: dot mode (just visible, no anims/tints beyond faction)
      if (tier === 0) {
        s.rotation = 0;
        renderedUnits++;
        continue;
      }

      // LOD 1+ animations
      let yOff = 0, rot = 0;
      if (state === ACTION.IDLE) {
        // Subtle breathing/standing sway so units don't look frozen
        yOff = Math.sin(now * 0.0035 + i * 0.7) * 0.4;
      } else if (state === ACTION.WALK) {
        if (race === 1)      yOff = Math.sin(now * 0.012 + i) > 0 ? 1 : 0;
        else if (race === 2) yOff = ((now + i * 10) % 400) > 250 ? 1 : 0;
        else if (race === 3) yOff = Math.sin(now * 0.008 + i) * 0.6;
        else                 yOff = Math.sin(now * 0.022 + i) > 0 ? 1 : 0;
      } else if (state === ACTION.ATTACK) {
        rot = Math.sin(now * 0.05) * 0.4;
        s.tint = 0xffaaaa;
        // Occasionally spawn a projectile sprite for ranged classes
        if (projectilesRef.current.length < 200 && Math.random() < 0.025) {
          const proj = projectileFor(type);
          if (proj) {
            const vy = velocities[i * 2 + 1];
            spawnProjectile(x, y, vx, vy, proj);
          }
        }
      } else if (state === ACTION.BUILD) {
        yOff = Math.sin(now * 0.05) * 2;
      }

      s.y = y + yOff;
      s.rotation = rot;
      renderedUnits++;
    }

    // Hide unused unit sprites
    for (let i = renderedUnits; i < pool.length; i++) {
      if (pool[i]) pool[i].visible = false;
    }

    // -------- BUILDINGS --------
    const bPool = buildingSpritesRef.current;
    const bCount = frame.bCount;
    const bPositions = frame.bPositions;
    const bRaces = frame.bRaces;
    const bSubTypes = frame.bSubTypes;
    const bAges = frame.bAges;

    let renderedBuildings = 0;
    for (let i = 0; i < bCount; i++) {
      const x = bPositions[i * 2];
      const y = bPositions[i * 2 + 1];
      const inView = x >= vL && x <= vR && y >= vT && y <= vB;

      let s = bPool[renderedBuildings];
      if (!s) {
        s = new Sprite();
        s.anchor.set(0.5, 1.0);
        objects.addChild(s);
        bPool[renderedBuildings] = s;
      }

      if (!inView) {
        s.visible = false;
        renderedBuildings++;
        continue;
      }

      const subType = bSubTypes[i];
      s.texture = getTexture(frameForBuilding(bRaces[i] as any, subType));
      s.x = x; s.y = y;
      s.zIndex = y;
      s.visible = true;

      // Per-subType scale (campfire small, castle big) × grow-from-ground anim
      const base = buildingScale(subType);
      const growth = Math.min(1.0, Math.max(0.15, bAges[i] / 50));
      s.scale.set(base, base * growth);
      renderedBuildings++;
    }
    for (let i = renderedBuildings; i < bPool.length; i++) {
      if (bPool[i]) bPool[i].visible = false;
    }

    // -------- BOATS --------
    const boatPool = boatSpritesRef.current;
    const boatCount = frame.boatCount;
    const boatPositions = frame.boatPositions;
    const boatVelocities = frame.boatVelocities;
    const boatTex = getTexture(PROP_FRAMES.BOAT);
    let renderedBoats = 0;
    for (let i = 0; i < boatCount; i++) {
      const x = boatPositions[i * 2];
      const y = boatPositions[i * 2 + 1];
      const inView = x >= vL && x <= vR && y >= vT && y <= vB;

      let s = boatPool[renderedBoats];
      if (!s) {
        s = new Sprite(boatTex);
        s.anchor.set(0.5, 0.65);
        objects.addChild(s);
        boatPool[renderedBoats] = s;
      }

      if (!inView) {
        s.visible = false;
        renderedBoats++;
        continue;
      }

      s.texture = boatTex;
      s.x = x; s.y = y;
      s.zIndex = y - 1; // just under any passengers (who sit at y+offsetY)
      s.visible = true;
      const vx = boatVelocities[i * 2];
      const scaleSign = vx < -0.05 ? -1 : 1;
      s.scale.set(scaleSign * ENV_SCALE.BOAT, ENV_SCALE.BOAT);
      // gentle bobbing
      s.y = y + Math.sin(now * 0.003 + i) * 0.6;
      renderedBoats++;
    }
    for (let i = renderedBoats; i < boatPool.length; i++) {
      if (boatPool[i]) boatPool[i].visible = false;
    }

    // -------- HEROES (DISCIPLE NPCs) --------
    // Pulse glow, scale by zoom, viewport cull, hover detection.
    const heroes = heroSpritesRef.current;
    const HERO_SPRITE_SCALE = Math.max(0.45, unitSpriteScale * 1.6);
    const pulse = 1 + Math.sin(now * 0.004) * 0.18;
    const hp = hoverPosRef.current;
    const wpX = (hp.x - wx) / scale;
    const wpY = (hp.y - wy) / scale;
    let hoveredHero: HeroDisciple | null = null;
    let bestHeroDistSq = 40 * 40;       // within ~40 world-px = hover radius
    for (const rec of heroes.values()) {
      const dx = rec.data.x;
      const dy = rec.data.y;
      const inView = dx >= vL && dx <= vR && dy >= vT && dy <= vB;
      rec.sprite.visible = inView;
      rec.glow.visible = inView;
      // Label only readable when zoomed past 0.7×; hide otherwise to reduce overdraw
      rec.label.visible = inView && scale >= 0.7;
      if (!inView) continue;
      rec.sprite.scale.set(HERO_SPRITE_SCALE);
      rec.glow.scale.set(pulse);
      rec.glow.alpha = 0.28 + Math.sin(now * 0.004 + rec.data.tokenId) * 0.08;
      const ddx = wpX - dx;
      const ddy = wpY - dy;
      const dsq = ddx * ddx + ddy * ddy;
      if (dsq < bestHeroDistSq) {
        bestHeroDistSq = dsq;
        hoveredHero = rec.data;
      }
    }
    if (props.onHoverDisciple) props.onHoverDisciple(hoveredHero);

    // -------- WATER WAVE SHIMMER --------
    updateWaveParticles(now, scale, vL, vR, vT, vB);

    // -------- HOVER REGION DETECTION --------
    if (props.worldState) {
      const hp = hoverPosRef.current;
      const wpX = (hp.x - wx) / scale;
      const wpY = (hp.y - wy) / scale;
      let nearest: SimRegion | null = null;
      let minDistSq = 2000 * 2000;
      for (const r of props.worldState.regions) {
        const dx = wpX - r.x, dy = wpY - r.y;
        const d = dx * dx + dy * dy;
        if (d < minDistSq) { minDistSq = d; nearest = r; }
      }
      props.onHoverRegion(nearest);
    }
  }

  // ------ INPUT -----------
  function attachInput(app: Application) {
    const canvas = app.canvas;

    canvas.addEventListener('mousedown', (e) => {
      dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mouseup', () => { dragRef.current.active = false; });
    canvas.addEventListener('mouseleave', () => { dragRef.current.active = false; });
    canvas.addEventListener('mousemove', (e) => {
      hoverPosRef.current = { x: e.clientX, y: e.clientY };
      const w = worldContainerRef.current;
      if (dragRef.current.active && w) {
        w.x += e.clientX - dragRef.current.x;
        w.y += e.clientY - dragRef.current.y;
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
      }
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const w = worldContainerRef.current;
      if (!w) return;
      const zoom = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.05, Math.min(4.0, w.scale.x * zoom));
      const worldX = (e.clientX - w.x) / w.scale.x;
      const worldY = (e.clientY - w.y) / w.scale.y;
      w.scale.set(newScale);
      w.x = e.clientX - worldX * newScale;
      w.y = e.clientY - worldY * newScale;
    }, { passive: false });
  }

  // ------ VFX ANIMATIONS ----------
  // ── Cinematic meteor strike ─────────────────────────────────────────────
  // Phases: warning shadow + ring → meteor descends with fire trail → bright
  // impact flash + 3-tier shockwave rings → debris + smoke column + screen
  // flash + camera shake. ~3 sec total runtime.
  function animateMeteor(targetX: number, targetY: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;

    // Warning: shadow ellipse on ground + pulsing red ring
    const shadow = new Graphics();
    shadow.ellipse(0, 0, 50, 18).fill({ color: 0x000000, alpha: 0.5 });
    shadow.x = targetX; shadow.y = targetY;
    shadow.scale.set(0);
    shadow.zIndex = 1;
    vfx.addChild(shadow);

    const ring = new Graphics();
    ring.circle(0, 0, 40).stroke({ color: 0xff3030, width: 3, alpha: 0.9 });
    ring.x = targetX; ring.y = targetY;
    ring.scale.set(0.4);
    vfx.addChild(ring);

    // Meteor sprite — descends at 45°
    const meteor = new Sprite(getTexture(VFX.METEOR));
    meteor.anchor.set(0.5);
    meteor.scale.set(3.5);
    meteor.x = targetX - 700;
    meteor.y = targetY - 900;
    meteor.zIndex = 99999;
    vfx.addChild(meteor);
    const startX = meteor.x, startY = meteor.y;
    meteor.rotation = Math.atan2(targetY - startY, targetX - startX) + Math.PI / 4;

    const trail: Array<{ g: Graphics; life: number; max: number }> = [];
    const SPARK_COLORS = [0xfff0a0, 0xff8a30, 0xff4500];
    let frame = 0;
    const WARN = 28, FALL_END = 56;

    const tick = () => {
      frame++;
      // Phase 1: warning grows (frames 1-28)
      if (frame <= WARN) {
        const t = frame / WARN;
        shadow.scale.set(t * 1.8);
        ring.scale.set(0.4 + t * 1.6);
        ring.alpha = 0.9 * (1 - t * 0.4);
      }
      // Phase 2: meteor descends (frames WARN+1 .. FALL_END)
      if (frame > WARN && frame <= FALL_END) {
        const t = (frame - WARN) / (FALL_END - WARN);
        const ease = t * t;
        meteor.x = startX + (targetX - startX) * ease;
        meteor.y = startY + (targetY - startY) * ease;
        meteor.scale.set(3.5 * (1 - t * 0.25));
        ring.alpha = Math.max(0, ring.alpha - 0.02);
        // Spawn 1-2 trail sparks per frame
        for (let i = 0; i < 2; i++) {
          const g = new Graphics();
          const c = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
          g.circle(0, 0, 2 + Math.random() * 3).fill({ color: c });
          g.x = meteor.x + (Math.random() - 0.5) * 24;
          g.y = meteor.y + (Math.random() - 0.5) * 24;
          g.zIndex = 99998;
          vfx.addChild(g);
          trail.push({ g, life: 18, max: 18 });
        }
      }
      // Phase 3: impact (frame FALL_END + 1) — spawn flash, shockwaves, debris
      if (frame === FALL_END + 1) {
        meteor.visible = false;
        shadow.visible = false;
        ring.visible = false;
        spawnImpactBurst(targetX, targetY);
        animateExplosion(targetX, targetY);
        animateSmokeColumn(targetX, targetY);
        triggerScreenShake(18);
        flashScreen(0xffeeaa, 0.55, 14);
      }
      // Fade trail particles
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i];
        t.life--;
        t.g.alpha = t.life / t.max;
        t.g.scale.set(0.85 + (t.life / t.max) * 0.3);
        if (t.life <= 0) { t.g.destroy(); trail.splice(i, 1); }
      }
      if (frame > FALL_END + 20 && trail.length === 0) {
        meteor.destroy(); shadow.destroy(); ring.destroy();
        app.ticker.remove(tick);
      }
    };
    app.ticker.add(tick);
  }

  // ── Cinematic lightning strike (Proof of Worship — the Demiurge's wrath) ──
  // Sky charges, a jagged bolt cracks down onto the hero, white flash + electric
  // shockwave + ground scorch + falling sparks + camera shake. ~1 sec.
  function animateLightning(targetX: number, targetY: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;

    const startY = targetY - 1400;

    const charge = new Graphics();
    charge.x = targetX; charge.y = targetY; charge.zIndex = 99990;
    vfx.addChild(charge);

    const bolt = new Graphics();
    bolt.zIndex = 100000;
    vfx.addChild(bolt);

    const scorch = new Graphics();
    scorch.x = targetX; scorch.y = targetY; scorch.zIndex = 2;
    vfx.addChild(scorch);

    const ring = new Graphics();
    ring.x = targetX; ring.y = targetY; ring.zIndex = 99991;
    vfx.addChild(ring);

    const sparks: Array<{ g: Graphics; vx: number; vy: number; life: number; max: number }> = [];

    const drawBolt = (jitter: number, alpha: number) => {
      bolt.clear();
      const segs = 16;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const jx = i > 0 && i < segs ? (Math.random() - 0.5) * jitter : 0;
        pts.push([targetX + jx, startY + (targetY - startY) * t]);
      }
      // outer glow
      bolt.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) bolt.lineTo(pts[i][0], pts[i][1]);
      bolt.stroke({ color: 0x66ccff, width: 11, alpha: alpha * 0.45, cap: 'round', join: 'round' });
      // a forked branch for menace
      const bi = (segs * 0.55) | 0;
      bolt.moveTo(pts[bi][0], pts[bi][1]);
      bolt.lineTo(pts[bi][0] + (Math.random() - 0.5) * 90, pts[bi][1] + 80);
      bolt.stroke({ color: 0x99ddff, width: 4, alpha: alpha * 0.5, cap: 'round', join: 'round' });
      // white-hot core
      bolt.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) bolt.lineTo(pts[i][0], pts[i][1]);
      bolt.stroke({ color: 0xffffff, width: 3, alpha, cap: 'round', join: 'round' });
    };

    let frame = 0;
    const CHARGE = 8, STRIKE = 9;
    const tick = () => {
      frame++;

      // Phase 1: charge gathers at the target
      if (frame <= CHARGE) {
        const t = frame / CHARGE;
        charge.clear();
        charge.circle(0, 0, 24 + t * 26).fill({ color: 0x66ccff, alpha: 0.12 + t * 0.28 });
      }

      // Phase 2: STRIKE
      if (frame === STRIKE) {
        drawBolt(64, 1);
        flashScreen(0xcdefff, 0.82, 7);
        triggerScreenShake(24);
        charge.visible = false;
        scorch.clear();
        scorch.ellipse(0, 0, 28, 11).fill({ color: 0x080808, alpha: 0.85 });
        for (let i = 0; i < 24; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 3 + Math.random() * 7;
          const g = new Graphics();
          g.circle(0, 0, 1.5 + Math.random() * 2).fill({ color: Math.random() < 0.5 ? 0xffffff : 0x88ddff });
          g.x = targetX; g.y = targetY; g.zIndex = 99999;
          vfx.addChild(g);
          sparks.push({ g, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 24, max: 24 });
        }
      }

      // Phase 3: bolt flickers then clears
      if (frame > STRIKE && frame <= STRIKE + 6) {
        if (frame % 2 === 0) { drawBolt(46, 1 - (frame - STRIKE) / 7); bolt.visible = true; }
        else bolt.visible = false;
      }
      if (frame === STRIKE + 7) { bolt.visible = true; bolt.clear(); }

      // expanding electric shockwave ring
      if (frame >= STRIKE && frame <= STRIKE + 18) {
        const t = (frame - STRIKE) / 18;
        ring.clear();
        ring.circle(0, 0, 10 + t * 80).stroke({ color: 0x66ccff, width: 3 * (1 - t), alpha: 0.85 * (1 - t) });
      }

      // sparks arc out + fall
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life--; s.vy += 0.45;
        s.g.x += s.vx; s.g.y += s.vy;
        s.g.alpha = s.life / s.max;
        if (s.life <= 0) { s.g.destroy(); sparks.splice(i, 1); }
      }

      if (frame > STRIKE + 26 && sparks.length === 0) {
        charge.destroy(); bolt.destroy(); ring.destroy(); scorch.destroy();
        app.ticker.remove(tick);
      }
    };
    app.ticker.add(tick);
  }

  // Bright impact flash + 3-tier coloured shockwave rings
  function spawnImpactBurst(x: number, y: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;
    const flash = new Graphics();
    flash.circle(0, 0, 60).fill({ color: 0xffffff, alpha: 0.95 });
    flash.x = x; flash.y = y; flash.zIndex = 99997;
    vfx.addChild(flash);
    const rings: Array<{ g: Graphics; speed: number; color: number }> = [
      { g: new Graphics(), speed: 14, color: 0xfff0a0 },
      { g: new Graphics(), speed: 10, color: 0xff7020 },
      { g: new Graphics(), speed: 6,  color: 0x8b2020 },
    ];
    for (const r of rings) {
      r.g.circle(0, 0, 8).stroke({ color: r.color, width: 5, alpha: 0.85 });
      r.g.x = x; r.g.y = y; r.g.zIndex = 99996;
      vfx.addChild(r.g);
    }
    let f = 0;
    const tick = () => {
      f++;
      flash.scale.set(1 + f * 0.4);
      flash.alpha = Math.max(0, 0.95 - f * 0.08);
      for (const r of rings) {
        r.g.scale.set(1 + f * r.speed * 0.18);
        r.g.alpha = Math.max(0, 0.85 - f * 0.025);
      }
      if (f > 36) {
        flash.destroy();
        for (const r of rings) r.g.destroy();
        app.ticker.remove(tick);
      }
    };
    app.ticker.add(tick);
  }

  // Dark smoke column rising after a meteor / big explosion. ~3 sec.
  function animateSmokeColumn(x: number, y: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;
    const SMOKE: Array<{ g: Graphics; vx: number; vy: number; life: number; max: number }> = [];
    let spawnedFor = 0;
    const tick = () => {
      spawnedFor++;
      // Emit 2-3 smoke puffs per frame for first 40 frames
      if (spawnedFor < 40) {
        for (let i = 0; i < 3; i++) {
          const g = new Graphics();
          const shade = 0x3a3530 + ((Math.random() * 0x10) | 0) * 0x010101;
          g.circle(0, 0, 8 + Math.random() * 14).fill({ color: shade, alpha: 0.55 });
          g.x = x + (Math.random() - 0.5) * 60;
          g.y = y - 10 + (Math.random() - 0.5) * 20;
          g.zIndex = 99500;
          vfx.addChild(g);
          SMOKE.push({
            g,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.8 - Math.random() * 0.7,
            life: 90 + Math.random() * 30,
            max: 90,
          });
        }
      }
      for (let i = SMOKE.length - 1; i >= 0; i--) {
        const s = SMOKE[i];
        s.g.x += s.vx;
        s.g.y += s.vy;
        s.vy *= 0.99;
        s.life--;
        const t = s.life / s.max;
        s.g.alpha = Math.max(0, t * 0.55);
        s.g.scale.set(1 + (1 - t) * 0.8);
        if (s.life <= 0) { s.g.destroy(); SMOKE.splice(i, 1); }
      }
      if (spawnedFor > 40 && SMOKE.length === 0) app.ticker.remove(tick);
    };
    app.ticker.add(tick);
  }

  // ── Layered debris explosion (used standalone or by meteor) ─────────────
  function animateExplosion(x: number, y: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;
    const tex = getTexture(VFX.EXPLOSION);
    const debris: Array<{ s: Sprite; vx: number; vy: number; rot: number; life: number }> = [];
    for (let i = 0; i < 55; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.x = x; s.y = y;
      s.scale.set(0.22 + Math.random() * 0.45);
      s.rotation = Math.random() * Math.PI * 2;
      s.zIndex = 99500;
      const ang = Math.random() * Math.PI * 2;
      const spd = 5 + Math.random() * 20;
      vfx.addChild(s);
      debris.push({
        s,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 4, // initial upward bias
        rot: (Math.random() - 0.5) * 0.4,
        life: 50,
      });
    }
    const tick = () => {
      let any = false;
      for (const p of debris) {
        if (p.life <= 0) continue;
        any = true;
        p.s.x += p.vx;
        p.s.y += p.vy;
        p.vy += 0.55;       // gravity
        p.vx *= 0.985;      // air drag
        p.s.rotation += p.rot;
        p.s.alpha = Math.max(0, p.life / 50);
        p.life--;
        if (p.life <= 0) p.s.destroy();
      }
      if (!any) app.ticker.remove(tick);
    };
    app.ticker.add(tick);
  }

  // Full-screen colour wash — used as a flash punctuation for big events.
  function flashScreen(color: number, peakAlpha: number, frames: number) {
    const app = appRef.current;
    if (!app) return;
    const g = new Graphics();
    g.rect(0, 0, app.screen.width, app.screen.height).fill({ color, alpha: 1 });
    g.alpha = peakAlpha;
    app.stage.addChild(g);
    let f = 0;
    const tick = () => {
      f++;
      g.alpha = peakAlpha * Math.max(0, 1 - f / frames);
      if (f >= frames) { g.destroy(); app.ticker.remove(tick); }
    };
    app.ticker.add(tick);
  }

  // -------- Helpers used in renderTick --------

  function spawnProjectile(x: number, y: number, vx: number, vy: number, frameName: string) {
    const vfx = vfxLayerRef.current;
    if (!vfx) return;
    const tex = getTexture(frameName);
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.x = x; s.y = y - 8;
    s.scale.set(0.5);
    const mag = Math.hypot(vx, vy) || 1;
    const speed = 7;
    const nvx = (vx / mag) * speed;
    const nvy = (vy / mag) * speed;
    s.rotation = Math.atan2(nvy, nvx);
    vfx.addChild(s);
    projectilesRef.current.push({ s, vx: nvx, vy: nvy, life: 25 });
  }

  function updateProjectiles() {
    const arr = projectilesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.s.x += p.vx;
      p.s.y += p.vy;
      p.life--;
      if (p.life < 10) p.s.alpha = p.life / 10;
      if (p.life <= 0) { p.s.destroy(); arr.splice(i, 1); }
    }
  }

  // Water shimmer — periodically spawn a small ripple on shallow-sea tiles in
  // view, animate alpha/scale, and despawn. Gives the ocean a "living" feel
  // without expensive shaders.
  function updateWaveParticles(
    now: number,
    scale: number,
    vL: number, vR: number, vT: number, vB: number,
  ) {
    const arr = wavesRef.current;
    const vfx = vfxLayerRef.current;
    const grid = biomeGridRef.current;
    if (!vfx || !grid) return;

    // Skip when zoomed far out — too small to read, costs FPS for nothing
    if (scale < 0.4) {
      for (const w of arr) { w.g.destroy(); }
      arr.length = 0;
      return;
    }

    // Spawn ~2 per second when room
    const MAX_WAVES = 60;
    if (arr.length < MAX_WAVES && Math.random() < 0.18) {
      // Pick a random viewport-aligned tile, retry up to 6 times for shallow_sea
      for (let attempt = 0; attempt < 6; attempt++) {
        const wx = vL + Math.random() * (vR - vL);
        const wy = vT + Math.random() * (vB - vT);
        const tx = (wx / TILE_PX) | 0;
        const ty = (wy / TILE_PX) | 0;
        if (tx < 0 || tx >= WORLD_TILES || ty < 0 || ty >= WORLD_TILES) continue;
        const biome = grid[ty * WORLD_TILES + tx];
        if (biome !== BIOME.SHALLOW_SEA && biome !== BIOME.DEEP_SEA) continue;
        const g = new Graphics();
        g.circle(0, 0, 4 + Math.random() * 3).stroke({ color: 0xffffff, width: 1, alpha: 0.55 });
        g.x = wx; g.y = wy;
        g.scale.set(0.3);
        vfx.addChild(g);
        const max = 50 + Math.random() * 30;
        arr.push({ g, life: max, max });
        break;
      }
    }

    // Animate existing
    for (let i = arr.length - 1; i >= 0; i--) {
      const w = arr[i];
      const t = 1 - w.life / w.max;
      w.g.scale.set(0.3 + t * 1.8);
      w.g.alpha = Math.sin(t * Math.PI) * 0.6;
      w.life--;
      if (w.life <= 0) { w.g.destroy(); arr.splice(i, 1); }
    }
  }

  // ── Weather (rain / snow) ────────────────────────────────────────────────
  // Particles spawn in viewport area above-the-fold and fall through. Rain is
  // straight + fast with a slight slant; snow is slow + wavy. When the prop
  // toggles to 'none', existing particles fade out and pool empties.
  function updateWeather(now: number, vL: number, vR: number, vT: number, vB: number) {
    const vfx = vfxLayerRef.current;
    if (!vfx) return;
    const pool = weatherParticlesRef.current;
    const mode = props.weather;

    if (mode === 'none') {
      // Despawn all existing
      for (const p of pool) p.s.destroy();
      pool.length = 0;
      return;
    }

    const TARGET = mode === 'rain' ? 180 : 110;
    const tex = mode === 'rain' ? getTexture(VFX.RAIN) : getTexture(VFX.SNOW);
    const baseScale = mode === 'rain' ? 0.25 : 0.32;
    const fallSpeed = mode === 'rain' ? 14 : 2.2;
    const slant = mode === 'rain' ? 2.5 : 0;

    // Spawn missing
    while (pool.length < TARGET) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(baseScale + Math.random() * 0.12);
      s.alpha = mode === 'rain' ? 0.65 : 0.85;
      s.x = vL + Math.random() * (vR - vL);
      s.y = vT - Math.random() * 200;
      s.zIndex = 90000;
      vfx.addChild(s);
      pool.push({
        s,
        vx: slant + (Math.random() - 0.5) * 0.5,
        vy: fallSpeed + Math.random() * 2,
        sway: Math.random() * Math.PI * 2,
      });
    }

    // Animate
    for (const p of pool) {
      if (mode === 'snow') {
        p.sway += 0.04;
        p.s.x += p.vx + Math.sin(p.sway) * 0.8;
        p.s.rotation = Math.sin(p.sway) * 0.3;
      } else {
        p.s.x += p.vx;
        p.s.rotation = Math.atan2(p.vy, p.vx);
      }
      p.s.y += p.vy;
      // Recycle when offscreen
      if (p.s.y > vB + 50 || p.s.x < vL - 100 || p.s.x > vR + 100) {
        p.s.x = vL + Math.random() * (vR - vL);
        p.s.y = vT - 30 - Math.random() * 100;
      }
    }
  }

  // ── Day / night cycle ────────────────────────────────────────────────────
  // 2-minute "day". Stops at midnight indigo → pre-dawn deep blue → dawn pink
  // → noon clear → dusk amber → twilight purple → night blue → loop.
  function updateDayNightOverlay(now: number) {
    const overlay = dayNightOverlayRef.current;
    const app = appRef.current;
    if (!overlay || !app) return;
    const CYCLE_MS = 120_000;            // 2-minute day, sped up for demo
    const t = (now % CYCLE_MS) / CYCLE_MS; // 0..1
    // Color stops as [t, r, g, b, alpha]
    const STOPS: ReadonlyArray<readonly [number, number, number, number, number]> = [
      [0.00, 16,  20,  55,  0.50],   // midnight
      [0.18, 28,  38,  78,  0.45],   // pre-dawn
      [0.25, 200, 110, 100, 0.22],   // dawn
      [0.30, 230, 180, 130, 0.10],   // morning
      [0.50, 255, 245, 210, 0.00],   // noon clear
      [0.68, 255, 150, 80,  0.18],   // late afternoon
      [0.75, 220, 90,  120, 0.28],   // dusk
      [0.83, 90,  60,  140, 0.40],   // twilight
      [0.92, 35,  45,  95,  0.46],   // night
      [1.00, 16,  20,  55,  0.50],   // back to midnight
    ];
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = 0; i < STOPS.length - 1; i++) {
      const s0 = STOPS[i], s1 = STOPS[i + 1];
      if (t >= s0[0] && t <= s1[0]) {
        const span = s1[0] - s0[0];
        const u = span > 0 ? (t - s0[0]) / span : 0;
        r = s0[1] + (s1[1] - s0[1]) * u;
        g = s0[2] + (s1[2] - s0[2]) * u;
        b = s0[3] + (s1[3] - s0[3]) * u;
        a = s0[4] + (s1[4] - s0[4]) * u;
        break;
      }
    }
    const color = ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
    overlay.clear();
    overlay.rect(0, 0, app.screen.width, app.screen.height)
      .fill({ color, alpha: a });
  }

  // Biome tile overlay — adds proper biome textures over the base color map.
  // Only active at zoom >= 1.5 (close-up). Viewport-culled, sprite-pooled.
  function updateBiomeOverlay(vL: number, vR: number, vT: number, vB: number, scale: number) {
    const overlay = tileOverlayLayerRef.current;
    const grid = biomeGridRef.current;
    const pool = tilePoolRef.current;
    if (!overlay || !grid) return;

    if (scale < 1.5) {
      // Hide all overlay tiles when zoomed out — base color map is enough
      for (let i = 0; i < pool.length; i++) pool[i].visible = false;
      return;
    }

    const tileSize = TILE_PX;
    const txMin = Math.max(0, Math.floor(vL / tileSize));
    const txMax = Math.min(WORLD_TILES - 1, Math.ceil(vR / tileSize));
    const tyMin = Math.max(0, Math.floor(vT / tileSize));
    const tyMax = Math.min(WORLD_TILES - 1, Math.ceil(vB / tileSize));

    let used = 0;
    const MAX_TILES = 1500;
    for (let ty = tyMin; ty <= tyMax && used < MAX_TILES; ty++) {
      for (let tx = txMin; tx <= txMax && used < MAX_TILES; tx++) {
        const biome = grid[ty * WORLD_TILES + tx];
        let s = pool[used];
        if (!s) {
          s = new Sprite();
          overlay.addChild(s);
          pool[used] = s;
        }
        s.texture = getTexture(frameForBiome(biome));
        s.x = tx * tileSize;
        s.y = ty * tileSize;
        s.visible = true;
        used++;
      }
    }
    for (let i = used; i < pool.length; i++) pool[i].visible = false;
  }

  // ── Cinematic blessing rain: golden sky-beam + sparkle star particles +
  //    ground halo. ~2.5 sec.
  function animateBlessing(x: number, y: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;

    // Sky beam descending column (golden gradient look approximated with stacked rects)
    const beam = new Graphics();
    beam.rect(-50, -700, 100, 700)
      .fill({ color: 0xffe066, alpha: 0.0 });
    beam.x = x; beam.y = y; beam.zIndex = 99000;
    vfx.addChild(beam);

    // Ground halo expanding circle
    const halo = new Graphics();
    halo.circle(0, 0, 30).fill({ color: 0xffe066, alpha: 0.5 });
    halo.x = x; halo.y = y; halo.zIndex = 98900;
    vfx.addChild(halo);

    const sparkles: Array<{ g: Graphics; vy: number; life: number; max: number; spin: number }> = [];
    let frame = 0;
    const tick = () => {
      frame++;
      // Beam fade in then fade out
      const beamAlpha = frame < 20 ? frame / 20 : Math.max(0, 1 - (frame - 60) / 30);
      beam.alpha = beamAlpha * 0.5;
      // Halo expansion + fade
      const haloT = frame / 80;
      halo.scale.set(1 + haloT * 4);
      halo.alpha = Math.max(0, 0.5 * (1 - haloT));
      // Spawn sparkles in column (frames 5..70)
      if (frame > 5 && frame < 70 && sparkles.length < 80) {
        for (let i = 0; i < 2; i++) {
          const g = new Graphics();
          const c = Math.random() < 0.6 ? 0xfff0a0 : 0xffffff;
          // 4-point star shape using two crossed rects
          g.rect(-1, -4, 2, 8).rect(-4, -1, 8, 2).fill({ color: c });
          g.x = x + (Math.random() - 0.5) * 120;
          g.y = y - 500 - Math.random() * 100;
          g.zIndex = 99100;
          vfx.addChild(g);
          sparkles.push({
            g,
            vy: 6 + Math.random() * 3,
            life: 80,
            max: 80,
            spin: (Math.random() - 0.5) * 0.15,
          });
        }
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const p = sparkles[i];
        p.g.y += p.vy;
        p.g.rotation += p.spin;
        p.life--;
        const t = p.life / p.max;
        p.g.alpha = Math.min(1, t * 1.4);
        p.g.scale.set(0.6 + t * 0.6);
        if (p.g.y >= y + 30 || p.life <= 0) { p.g.destroy(); sparkles.splice(i, 1); }
      }
      if (frame > 90 && sparkles.length === 0) {
        beam.destroy(); halo.destroy(); app.ticker.remove(tick);
      }
    };
    app.ticker.add(tick);
  }

  // ── Cinematic plague wave: expanding sickly-green dome + rising bone-grey
  //    wisps + creeping ground tint. ~2 sec.
  function animatePlague(x: number, y: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;

    // 3 nested expanding domes for depth
    const domes: Graphics[] = [];
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      const c = i === 0 ? 0x6b0080 : i === 1 ? 0x44aa44 : 0x880088;
      g.circle(0, 0, 20).fill({ color: c, alpha: 0.32 });
      g.x = x; g.y = y; g.zIndex = 98000 + i;
      vfx.addChild(g);
      domes.push(g);
    }

    const wisps: Array<{ g: Graphics; vy: number; vx: number; life: number; max: number }> = [];
    let frame = 0;
    const tick = () => {
      frame++;
      // Domes expand at different rates with falling alpha
      for (let i = 0; i < domes.length; i++) {
        const scale = 1 + frame * (0.25 - i * 0.06);
        domes[i].scale.set(scale);
        domes[i].alpha = Math.max(0, 0.32 * (1 - frame / 90));
      }
      // Spawn ghostly wisps rising upward
      if (frame < 60 && wisps.length < 40 && Math.random() < 0.4) {
        const g = new Graphics();
        const c = Math.random() < 0.5 ? 0xaaff88 : 0xc0a0d0;
        g.circle(0, 0, 4 + Math.random() * 6).fill({ color: c, alpha: 0.6 });
        g.x = x + (Math.random() - 0.5) * 200;
        g.y = y + 10;
        g.zIndex = 98100;
        vfx.addChild(g);
        wisps.push({
          g,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -1.2 - Math.random() * 0.8,
          life: 70,
          max: 70,
        });
      }
      for (let i = wisps.length - 1; i >= 0; i--) {
        const w = wisps[i];
        w.g.x += w.vx;
        w.g.y += w.vy;
        w.life--;
        const t = w.life / w.max;
        w.g.alpha = Math.max(0, 0.6 * t);
        w.g.scale.set(1 + (1 - t) * 0.8);
        if (w.life <= 0) { w.g.destroy(); wisps.splice(i, 1); }
      }
      if (frame > 95 && wisps.length === 0) {
        for (const d of domes) d.destroy();
        app.ticker.remove(tick);
      }
    };
    app.ticker.add(tick);
  }

  // Generic colored flash burst — used by the misc divine tool fallback.
  function animateFlash(x: number, y: number, color: number) {
    const app = appRef.current, vfx = vfxLayerRef.current;
    if (!app || !vfx) return;
    const core = new Graphics();
    core.circle(0, 0, 30).fill({ color, alpha: 0.85 });
    core.x = x; core.y = y; core.zIndex = 99000;
    vfx.addChild(core);
    const ring = new Graphics();
    ring.circle(0, 0, 15).stroke({ color, width: 4, alpha: 0.9 });
    ring.x = x; ring.y = y; ring.zIndex = 98900;
    vfx.addChild(ring);
    let f = 0;
    const tick = () => {
      f++;
      core.scale.set(1 + f * 0.2);
      core.alpha = Math.max(0, 0.85 - f * 0.04);
      ring.scale.set(1 + f * 0.35);
      ring.alpha = Math.max(0, 0.9 - f * 0.025);
      if (f > 35) { core.destroy(); ring.destroy(); app.ticker.remove(tick); }
    };
    app.ticker.add(tick);
  }

  // Eased screen shake — amplitude decays cubically (more punch up front)
  function triggerScreenShake(initial: number = 14) {
    const app = appRef.current;
    if (!app) return;
    const stage = app.stage;
    const origX = stage.x, origY = stage.y;
    let frame = 0;
    const TOTAL = 22;
    const shake = () => {
      frame++;
      const t = 1 - frame / TOTAL;
      const amp = initial * t * t * t;
      stage.x = origX + (Math.random() - 0.5) * amp;
      stage.y = origY + (Math.random() - 0.5) * amp;
      if (frame >= TOTAL) {
        stage.x = origX; stage.y = origY;
        app.ticker.remove(shake);
      }
    };
    app.ticker.add(shake);
  }

  return <div ref={hostRef} className="absolute inset-0" />;
}
