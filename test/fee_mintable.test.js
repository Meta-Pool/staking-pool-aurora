const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  botsHordeFixture,
  TOTAL_SPAMBOTS,
} = require("./test_setup");

describe("Testing the Staking Manager functionality for minting fee 🪙.", function () {
  it("Should mint ONLY for Treasury ROLE.", async function () {
    const {
      stakingManagerContract,
      treasury
    } = await loadFixture(botsHordeFixture);

    await expect(
      stakingManagerContract.mintFee()
    ).to.be.revertedWith("AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9");
    await time.increase(await stakingManagerContract.coolingTimeSeconds());
    await stakingManagerContract.connect(treasury).mintFee();
  });

  it("Should mint ONLY after cooling period.", async function () {
    const {
      stakingManagerContract,
      treasury
    } = await loadFixture(botsHordeFixture);

    await expect(
      stakingManagerContract.connect(treasury).mintFee()
    ).to.be.revertedWithCustomError(stakingManagerContract, "FeeMintNotAvailable");
  });

  it("Should mint correct amounts NOW.", async function () {
    const {
      StakedAuroraVaultContract,
      stakingManagerContract,
      treasury,
    } = await loadFixture(botsHordeFixture);

    const initialMintFee = await stakingManagerContract.getAvailableMintFee();
    const totalSupply = await StakedAuroraVaultContract.totalSupply();

    /// Move forward after cooling time 🥶.
    await time.increase(await stakingManagerContract.coolingTimeSeconds());
    await stakingManagerContract.connect(treasury).mintFee();

    // The `initialMintFee` value is increasing with time.
    expect(
      await StakedAuroraVaultContract.totalSupply()
    ).to.be.greaterThan(totalSupply.add(initialMintFee));
  });

  it("Should mint correct amounts in 1 year (ahead).", async function () {
    const {
      StakedAuroraVaultContract,
      stakingManagerContract,
      treasury,
    } = await loadFixture(botsHordeFixture);

    const initialMintFee = await stakingManagerContract.getAvailableMintFee();
    const totalSupply = await StakedAuroraVaultContract.totalSupply();

    expect(await StakedAuroraVaultContract.balanceOf(treasury.address)).to.equal(0);

    /// Move forward after cooling time 🥶.
    await time.increase(await stakingManagerContract.SECONDS_PER_YEAR());
    await stakingManagerContract.connect(treasury).mintFee();

    // The `initialMintFee` value is increasing with time.
    expect(
      await StakedAuroraVaultContract.totalSupply()
    ).to.be.greaterThan(totalSupply.add(initialMintFee));

    expect(
      await StakedAuroraVaultContract.balanceOf(treasury.address)
    ).to.equal(
      (await StakedAuroraVaultContract.totalSupply()).sub(totalSupply)
    );
  });
});
