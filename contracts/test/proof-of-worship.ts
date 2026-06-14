import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

const REWARD = ethers.parseUnits("0.1", 6); // 0.1 USDY per sincere prayer
const DAY = 20618;
const SCORE = 88;

async function deployFixture() {
  const [owner, oracleSigner, alice, bob, attacker] = await ethers.getSigners();

  const MockUSDY = await ethers.getContractFactory("MockUSDY");
  const usdy = await MockUSDY.deploy();
  await usdy.waitForDeployment();

  const TempleVault = await ethers.getContractFactory("TempleVault");
  const vault = await TempleVault.deploy(await usdy.getAddress(), oracleSigner.address);
  await vault.waitForDeployment();

  const ProofOfWorship = await ethers.getContractFactory("ProofOfWorship");
  const pow = await ProofOfWorship.deploy(
    await usdy.getAddress(),
    await vault.getAddress(),
    oracleSigner.address, // worshipSigner = the AI attestation key
    REWARD
  );
  await pow.waitForDeployment();

  // alice becomes a staked Disciple (cardOf != 0)
  const stake = ethers.parseUnits("100", 6);
  await usdy.mint(alice.address, stake);
  await usdy.connect(alice).approve(await vault.getAddress(), stake);
  await vault.connect(alice).enter(stake);

  // EIP-712 domain/types for signing WorshipPass in tests
  const { chainId } = await ethers.provider.getNetwork();
  const domain = {
    name: "CultProofOfWorship",
    version: "1",
    chainId,
    verifyingContract: await pow.getAddress(),
  };
  const types = {
    WorshipPass: [
      { name: "disciple", type: "address" },
      { name: "day", type: "uint256" },
      { name: "score", type: "uint8" },
    ],
  };

  const fundPool = async (amount = REWARD * 10n) => usdy.mint(await pow.getAddress(), amount);
  const sign = (signer: any, disciple: string, day: number, score: number) =>
    signer.signTypedData(domain, types, { disciple, day, score });

  return { owner, oracleSigner, alice, bob, attacker, usdy, vault, pow, fundPool, sign };
}

describe("ProofOfWorship", function () {
  describe("Deployment", function () {
    it("wires usdy, vault, signer, reward, and owner", async function () {
      const { owner, oracleSigner, usdy, vault, pow } = await loadFixture(deployFixture);
      expect(await pow.usdy()).to.equal(await usdy.getAddress());
      expect(await pow.vault()).to.equal(await vault.getAddress());
      expect(await pow.worshipSigner()).to.equal(oracleSigner.address);
      expect(await pow.rewardPerWorship()).to.equal(REWARD);
      expect(await pow.owner()).to.equal(owner.address);
    });
  });

  describe("worship — happy path", function () {
    it("pays the reward, records the day, and emits Worshipped", async function () {
      const { oracleSigner, alice, usdy, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      const sig = await sign(oracleSigner, alice.address, DAY, SCORE);

      const before = await usdy.balanceOf(alice.address);
      await expect(pow.connect(alice).worship(DAY, SCORE, sig))
        .to.emit(pow, "Worshipped")
        .withArgs(alice.address, DAY, SCORE, REWARD);

      expect((await usdy.balanceOf(alice.address)) - before).to.equal(REWARD);
      expect(await pow.worshipped(alice.address, DAY)).to.equal(true);
      expect(await pow.hasWorshipped(alice.address, DAY)).to.equal(true);
    });
  });

  describe("worship — failure paths", function () {
    it("reverts NotDisciple for a wallet that hasn't staked", async function () {
      const { oracleSigner, bob, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      const sig = await sign(oracleSigner, bob.address, DAY, SCORE);
      await expect(pow.connect(bob).worship(DAY, SCORE, sig)).to.be.revertedWithCustomError(
        pow,
        "NotDisciple"
      );
    });

    it("reverts BadPrayerPass for a signature from the wrong key", async function () {
      const { attacker, alice, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      const forged = await sign(attacker, alice.address, DAY, SCORE); // not the worshipSigner
      await expect(pow.connect(alice).worship(DAY, SCORE, forged)).to.be.revertedWithCustomError(
        pow,
        "BadPrayerPass"
      );
    });

    it("reverts BadPrayerPass if the player tampers the score", async function () {
      const { oracleSigner, alice, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      const sig = await sign(oracleSigner, alice.address, DAY, 70); // signed for 70
      await expect(pow.connect(alice).worship(DAY, 100, sig)).to.be.revertedWithCustomError(
        pow,
        "BadPrayerPass"
      ); // submitted 100
    });

    it("reverts AlreadyWorshipped on a second prayer the same day", async function () {
      const { oracleSigner, alice, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      const sig = await sign(oracleSigner, alice.address, DAY, SCORE);
      await pow.connect(alice).worship(DAY, SCORE, sig);
      await expect(pow.connect(alice).worship(DAY, SCORE, sig)).to.be.revertedWithCustomError(
        pow,
        "AlreadyWorshipped"
      );
    });

    it("allows the same disciple to worship again on a different day", async function () {
      const { oracleSigner, alice, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      await pow.connect(alice).worship(DAY, SCORE, await sign(oracleSigner, alice.address, DAY, SCORE));
      await expect(
        pow.connect(alice).worship(DAY + 1, SCORE, await sign(oracleSigner, alice.address, DAY + 1, SCORE))
      ).to.emit(pow, "Worshipped");
    });

    it("reverts PoolEmpty when the worship pool is underfunded", async function () {
      const { oracleSigner, alice, pow, sign } = await loadFixture(deployFixture);
      // pool intentionally NOT funded
      const sig = await sign(oracleSigner, alice.address, DAY, SCORE);
      await expect(pow.connect(alice).worship(DAY, SCORE, sig)).to.be.revertedWithCustomError(
        pow,
        "PoolEmpty"
      );
    });
  });

  describe("admin", function () {
    it("only the owner can setSigner / setReward / sweep", async function () {
      const { alice, pow } = await loadFixture(deployFixture);
      await expect(pow.connect(alice).setSigner(alice.address)).to.be.revertedWithCustomError(
        pow,
        "OwnableUnauthorizedAccount"
      );
      await expect(pow.connect(alice).setReward(1)).to.be.revertedWithCustomError(
        pow,
        "OwnableUnauthorizedAccount"
      );
      await expect(pow.connect(alice).sweep(alice.address, 1)).to.be.revertedWithCustomError(
        pow,
        "OwnableUnauthorizedAccount"
      );
    });

    it("rotating the signer makes the new key's signatures valid", async function () {
      const { owner, attacker, alice, pow, fundPool, sign } = await loadFixture(deployFixture);
      await fundPool();
      await expect(pow.connect(owner).setSigner(attacker.address))
        .to.emit(pow, "SignerUpdated")
        .withArgs(attacker.address);

      const sig = await sign(attacker, alice.address, DAY, SCORE);
      await expect(pow.connect(alice).worship(DAY, SCORE, sig)).to.emit(pow, "Worshipped");
    });

    it("owner can sweep unused pool funds", async function () {
      const { owner, usdy, pow, fundPool } = await loadFixture(deployFixture);
      await fundPool(REWARD);
      const before = await usdy.balanceOf(owner.address);
      await pow.connect(owner).sweep(owner.address, REWARD);
      expect((await usdy.balanceOf(owner.address)) - before).to.equal(REWARD);
    });
  });
});
