import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

const SNAP = {
  stateHash: ethers.id("world-state-day-1"),
  totalEntities: 100,
  totalPopulation: 95,
  totalFaith: 5_000n * 10n ** 6n, // 5000 USDY-analog, scaled 1e6 (fits uint64)
  dominantFaction: 0, // believer
  activeRegions: 3,
  snapshotAt: 1_779_000_000, // nonzero unix ts (existence sentinel)
};

const EVENT = {
  toolId: 5, // Meteor Strike
  polarity: 0, // evil
  executedAt: 1_779_000_000,
  targetRegion: 255, // global
  magnitude: 800,
};

const PREVIEW = {
  toolIds: [5, 0, 6, 2, 3],
  weights: [85, 65, 45, 30, 15],
  forcedPolarity: 2, // free
  decisionAt: 1_779_000_000,
  scheduledFor: 1_779_086_400, // +24h
  prophecyHash: "the void shall stir",
};

async function deployFixture() {
  const [owner, civEngine, other] = await ethers.getSigners();
  const CivilizationLog = await ethers.getContractFactory("CivilizationLog");
  const civLog = await CivilizationLog.deploy(civEngine.address);
  await civLog.waitForDeployment();
  return { owner, civEngine, other, civLog };
}

describe("CivilizationLog", function () {
  describe("Deployment & access control", function () {
    it("sets owner (deployer) and civEngine in the constructor", async function () {
      const { owner, civEngine, civLog } = await loadFixture(deployFixture);
      expect(await civLog.owner()).to.equal(owner.address);
      expect(await civLog.civEngine()).to.equal(civEngine.address);
    });

    it("emits CivEngineUpdated on deploy", async function () {
      const [, civEngine] = await ethers.getSigners();
      const CivilizationLog = await ethers.getContractFactory("CivilizationLog");
      const civLog = await CivilizationLog.deploy(civEngine.address);
      await expect(civLog.deploymentTransaction())
        .to.emit(civLog, "CivEngineUpdated")
        .withArgs(civEngine.address);
    });

    it("reverts NotCivEngine when a non-engine posts a snapshot", async function () {
      const { other, civLog } = await loadFixture(deployFixture);
      await expect(
        civLog.connect(other).postSnapshot(1, SNAP)
      ).to.be.revertedWithCustomError(civLog, "NotCivEngine");
    });

    it("reverts NotCivEngine when a non-engine logs a divine event", async function () {
      const { owner, civLog } = await loadFixture(deployFixture);
      // even the owner is not the civEngine here
      await expect(
        civLog.connect(owner).logDivineEvent(EVENT)
      ).to.be.revertedWithCustomError(civLog, "NotCivEngine");
    });

    it("reverts NotCivEngine when a non-engine posts a preview", async function () {
      const { other, civLog } = await loadFixture(deployFixture);
      await expect(
        civLog.connect(other).postDemiurgePreview(PREVIEW)
      ).to.be.revertedWithCustomError(civLog, "NotCivEngine");
    });

    it("only the owner can rotate civEngine", async function () {
      const { other, civLog } = await loadFixture(deployFixture);
      await expect(
        civLog.connect(other).setCivEngine(other.address)
      ).to.be.revertedWithCustomError(civLog, "OwnableUnauthorizedAccount");
    });
  });

  describe("postSnapshot", function () {
    it("stores the snapshot, bumps the count, and emits SnapshotPosted", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);

      await expect(civLog.connect(civEngine).postSnapshot(20618, SNAP))
        .to.emit(civLog, "SnapshotPosted")
        .withArgs(20618, SNAP.stateHash, SNAP.totalPopulation, SNAP.totalFaith);

      expect(await civLog.totalSnapshotCount()).to.equal(1);
      expect(await civLog.totalSnapshots()).to.equal(1);

      const s = await civLog.getSnapshot(20618);
      expect(s.stateHash).to.equal(SNAP.stateHash);
      expect(s.totalEntities).to.equal(SNAP.totalEntities);
      expect(s.totalPopulation).to.equal(SNAP.totalPopulation);
      expect(s.totalFaith).to.equal(SNAP.totalFaith);
      expect(s.dominantFaction).to.equal(SNAP.dominantFaction);
      expect(s.activeRegions).to.equal(SNAP.activeRegions);
      expect(s.snapshotAt).to.equal(SNAP.snapshotAt);
    });

    it("reverts SnapshotAlreadyExists on a duplicate day", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);
      await civLog.connect(civEngine).postSnapshot(20618, SNAP);
      await expect(
        civLog.connect(civEngine).postSnapshot(20618, SNAP)
      ).to.be.revertedWithCustomError(civLog, "SnapshotAlreadyExists");
      // count unchanged
      expect(await civLog.totalSnapshotCount()).to.equal(1);
    });

    it("allows distinct days and keeps them independent", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);
      await civLog.connect(civEngine).postSnapshot(20618, SNAP);
      await civLog.connect(civEngine).postSnapshot(20619, { ...SNAP, totalPopulation: 110 });

      expect(await civLog.totalSnapshotCount()).to.equal(2);
      expect((await civLog.getSnapshot(20618)).totalPopulation).to.equal(95);
      expect((await civLog.getSnapshot(20619)).totalPopulation).to.equal(110);
    });

    it("returns a zeroed snapshot for a day never posted", async function () {
      const { civLog } = await loadFixture(deployFixture);
      const s = await civLog.getSnapshot(99999);
      expect(s.snapshotAt).to.equal(0);
      expect(s.totalPopulation).to.equal(0);
      expect(s.stateHash).to.equal(ethers.ZeroHash);
    });
  });

  describe("logDivineEvent", function () {
    it("appends events, increments the count, and emits with the right eventId", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);
      expect(await civLog.getDivineEventCount()).to.equal(0);

      await expect(civLog.connect(civEngine).logDivineEvent(EVENT))
        .to.emit(civLog, "DivineEventLogged")
        .withArgs(0, EVENT.toolId, EVENT.polarity, EVENT.executedAt);

      expect(await civLog.getDivineEventCount()).to.equal(1);

      const good = { ...EVENT, toolId: 0, polarity: 1, targetRegion: 1, magnitude: 500 };
      await expect(civLog.connect(civEngine).logDivineEvent(good))
        .to.emit(civLog, "DivineEventLogged")
        .withArgs(1, good.toolId, good.polarity, good.executedAt);

      expect(await civLog.getDivineEventCount()).to.equal(2);
    });

    it("getDivineEvent returns the stored event by index", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);
      await civLog.connect(civEngine).logDivineEvent(EVENT);

      const ev = await civLog.getDivineEvent(0);
      expect(ev.toolId).to.equal(EVENT.toolId);
      expect(ev.polarity).to.equal(EVENT.polarity);
      expect(ev.executedAt).to.equal(EVENT.executedAt);
      expect(ev.targetRegion).to.equal(EVENT.targetRegion);
      expect(ev.magnitude).to.equal(EVENT.magnitude);
    });

    it("reverts when reading an out-of-range event index", async function () {
      const { civLog } = await loadFixture(deployFixture);
      await expect(civLog.getDivineEvent(0)).to.be.reverted; // panic 0x32, array OOB
    });
  });

  describe("postDemiurgePreview", function () {
    it("stores the latest preview and emits DemiurgePreviewPosted", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);

      await expect(civLog.connect(civEngine).postDemiurgePreview(PREVIEW)).to.emit(
        civLog,
        "DemiurgePreviewPosted"
      );

      const p = await civLog.getLatestPreview();
      expect(p.toolIds.map(Number)).to.deep.equal(PREVIEW.toolIds);
      expect(p.weights.map(Number)).to.deep.equal(PREVIEW.weights);
      expect(p.forcedPolarity).to.equal(PREVIEW.forcedPolarity);
      expect(p.decisionAt).to.equal(PREVIEW.decisionAt);
      expect(p.scheduledFor).to.equal(PREVIEW.scheduledFor);
      expect(p.prophecyHash).to.equal(PREVIEW.prophecyHash);
    });

    it("overwrites the preview on each post (only latest is kept)", async function () {
      const { civEngine, civLog } = await loadFixture(deployFixture);
      await civLog.connect(civEngine).postDemiurgePreview(PREVIEW);

      const next = {
        ...PREVIEW,
        toolIds: [1, 2, 3, 4, 7],
        weights: [50, 40, 30, 20, 10],
        forcedPolarity: 1,
        prophecyHash: "the fields ripen",
      };
      await civLog.connect(civEngine).postDemiurgePreview(next);

      const p = await civLog.getLatestPreview();
      expect(p.toolIds.map(Number)).to.deep.equal(next.toolIds);
      expect(p.forcedPolarity).to.equal(1);
      expect(p.prophecyHash).to.equal("the fields ripen");
    });
  });

  describe("civEngine rotation", function () {
    it("lets the new engine write and blocks the old one after setCivEngine", async function () {
      const { owner, civEngine, other, civLog } = await loadFixture(deployFixture);

      await expect(civLog.connect(owner).setCivEngine(other.address))
        .to.emit(civLog, "CivEngineUpdated")
        .withArgs(other.address);
      expect(await civLog.civEngine()).to.equal(other.address);

      // new engine can write
      await expect(civLog.connect(other).postSnapshot(1, SNAP)).to.not.be.reverted;
      // old engine is now rejected
      await expect(
        civLog.connect(civEngine).postSnapshot(2, SNAP)
      ).to.be.revertedWithCustomError(civLog, "NotCivEngine");
    });
  });
});
