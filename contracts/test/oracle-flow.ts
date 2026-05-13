import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

async function deployFixture() {
  const [owner, oracle, alice, bob] = await ethers.getSigners();

  const MockUSDY = await ethers.getContractFactory("MockUSDY");
  const usdy = await MockUSDY.deploy();
  await usdy.waitForDeployment();

  const TempleVault = await ethers.getContractFactory("TempleVault");
  const vault = await TempleVault.deploy(await usdy.getAddress(), oracle.address);
  await vault.waitForDeployment();

  const BlessingDistributor = await ethers.getContractFactory("BlessingDistributor");
  const distributor = await BlessingDistributor.deploy(
    await usdy.getAddress(),
    await vault.getAddress(),
    oracle.address
  );
  await distributor.waitForDeployment();

  return { owner, oracle, alice, bob, usdy, vault, distributor };
}

describe("Digital Oracle core flow", function () {
  it("rejects blessing rounds when nobody is staked", async function () {
    const { oracle, usdy, distributor } = await loadFixture(deployFixture);
    const yieldAmount = ethers.parseUnits("25", 6);

    await usdy.mint(oracle.address, yieldAmount);
    await usdy.connect(oracle).approve(await distributor.getAddress(), yieldAmount);

    await expect(
      distributor.connect(oracle).queueBlessing(1, yieldAmount)
    ).to.be.revertedWithCustomError(distributor, "NoActiveFaith");
  });

  it("preserves claims for past rounds after exit but blocks future rounds", async function () {
    const { oracle, alice, bob, usdy, vault, distributor } = await loadFixture(deployFixture);
    const stakeAmount = ethers.parseUnits("100", 6);
    const yieldAmount = ethers.parseUnits("50", 6);

    await usdy.mint(alice.address, stakeAmount);
    await usdy.connect(alice).approve(await vault.getAddress(), stakeAmount);
    await vault.connect(alice).enter(stakeAmount);

    await usdy.mint(oracle.address, yieldAmount * 2n);
    await usdy.connect(oracle).approve(await distributor.getAddress(), yieldAmount * 2n);

    await distributor.connect(oracle).queueBlessing(1, yieldAmount);

    await vault.connect(alice).exit(1);

    expect(await distributor.pendingBlessing(1, 1)).to.equal(yieldAmount);

    await expect(() => distributor.connect(alice).claim(1, 1)).to.changeTokenBalances(
      usdy,
      [distributor, alice],
      [-yieldAmount, yieldAmount]
    );

    await usdy.mint(bob.address, stakeAmount);
    await usdy.connect(bob).approve(await vault.getAddress(), stakeAmount);
    await vault.connect(bob).enter(stakeAmount);

    await distributor.connect(oracle).queueBlessing(2, yieldAmount);

    expect(await distributor.pendingBlessing(2, 1)).to.equal(0);
    expect(await distributor.pendingBlessing(2, 2)).to.equal(yieldAmount);
  });
});
