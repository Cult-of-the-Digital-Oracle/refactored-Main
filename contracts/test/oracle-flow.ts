import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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

  const OracleMessage = await ethers.getContractFactory("OracleMessage");
  const oracleMessage = await OracleMessage.deploy(oracle.address);
  await oracleMessage.waitForDeployment();

  return { owner, oracle, alice, bob, usdy, vault, distributor, oracleMessage };
}

describe("Digital Oracle core flow", function () {
  it("stores resolution reason and evidence with the score", async function () {
    const { oracle, oracleMessage } = await loadFixture(deployFixture);

    const postTx = await oracleMessage.connect(oracle).postProphecy("The chain will wake.");
    const receipt = await postTx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const day = BigInt(Math.floor(block!.timestamp / 86400));

    await expect(
      oracleMessage
        .connect(oracle)
        .resolveProphecy(day, 84, "Activity rose across sampled blocks.", "sampledTx=42; activeAddresses=21")
    )
      .to.emit(oracleMessage, "ProphecyResolved")
      .withArgs(day, 84, "Activity rose across sampled blocks.", "sampledTx=42; activeAddresses=21");

    const prophecy = await oracleMessage.getProphecy(day);
    expect(prophecy.fulfillmentScore).to.equal(84);
    expect(prophecy.resolutionReason).to.equal("Activity rose across sampled blocks.");
    expect(prophecy.evidence).to.equal("sampledTx=42; activeAddresses=21");
    expect(prophecy.resolved).to.equal(true);
  });

  it("rejects blessing rounds when nobody is staked", async function () {
    const { oracle, usdy, distributor } = await loadFixture(deployFixture);
    const yieldAmount = ethers.parseUnits("25", 6);

    await usdy.mint(oracle.address, yieldAmount);
    await usdy.connect(oracle).approve(await distributor.getAddress(), yieldAmount);

    await expect(
      distributor.connect(oracle).queueBlessing(1, yieldAmount)
    ).to.be.revertedWithCustomError(distributor, "NoActiveFaith");
  });

  it("allows one daily check-in for active disciples", async function () {
    const { alice, usdy, vault } = await loadFixture(deployFixture);
    const stakeAmount = ethers.parseUnits("25", 6);

    await usdy.mint(alice.address, stakeAmount);
    await usdy.connect(alice).approve(await vault.getAddress(), stakeAmount);
    await vault.connect(alice).enter(stakeAmount);

    await expect(vault.connect(alice).checkIn(1))
      .to.emit(vault, "FaithCheckedIn")
      .and.to.emit(vault, "KarmaGranted")
      .withArgs(1, 5);

    let disciple = await vault.disciples(1);
    expect(disciple.karma).to.equal(5);

    await expect(vault.connect(alice).checkIn(1)).to.be.revertedWithCustomError(
      vault,
      "AlreadyCheckedIn"
    );

    await time.increase(24 * 60 * 60);
    await vault.connect(alice).checkIn(1);

    disciple = await vault.disciples(1);
    expect(disciple.karma).to.equal(10);
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
