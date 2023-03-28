const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployPoolFixture, liquidityPoolFixture } = require("./load_fixtures");

const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

describe("Liquidity Pool StAUR <> AURORA", function () {
  describe("Deployment", function () {
    it("Should be correct for LP contract initial parameters.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        liquidity_pool_owner,
        stakedAuroraVaultContract
      } = await loadFixture(deployPoolFixture);

      expect(await liquidityPoolContract.owner()).to.equal(liquidity_pool_owner.address);
      expect(await liquidityPoolContract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await liquidityPoolContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(0);
      expect(await liquidityPoolContract.swapFeeBasisPoints()).to.equal(200);
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob, Carl and Liq Provider.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        liquidityPoolContract,
        liquidity_provider,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      // AURORA tokens in the users balances.
      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      const stakingBalance = await auroraTokenContract.balanceOf(auroraStakingContract.address);
      const liquidityBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);

      // AURORA tokens in the liquidity pool.
      const lpTokenBalance = await liquidityPoolContract.balanceOf(liquidity_provider.address);
      const poolBalance = await liquidityPoolContract.convertToAssets(lpTokenBalance);

      expect(await auroraTokenContract.totalSupply()).to.equal(
        aliceBalance.add(bobBalance).add(carlBalance).add(stakingBalance).add(liquidityBalance).add(poolBalance));
    });
  });

  describe("Swap", function () {
    it("Should allow multiple swaps and keep the balances correct.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        stakedAuroraVaultContract,
        liquidity_provider,
        decimals,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      var auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(decimals);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.colledtedStAurFees()).to.equal(0);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);

      // StAUR deposits to the Liquidity Pool.
      const providerSwap = ethers.BigNumber.from(90_000).mul(decimals); // The amount of stAUR the provider will swap back to AURORA.
      await stakedAuroraVaultContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerSwap);

      const providerPreBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);
      await liquidityPoolContract.connect(liquidity_provider).swapStAurforAurora(
        providerSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(providerSwap)
      );
      const providerPostBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);

      var stAurBalanceTracker = ethers.BigNumber.from("88200000000000000000000");
      var colledtedStAurFeesTracker = ethers.BigNumber.from("1800000000000000000000");
      expect(await liquidityPoolContract.stAurBalance()).to.equal(stAurBalanceTracker);
      expect(await liquidityPoolContract.colledtedStAurFees()).to.equal(colledtedStAurFeesTracker);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        providerPostBalance.sub(providerPreBalance));

      // Alice swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const aliceSwap = ethers.BigNumber.from(200).mul(decimals);
      await stakedAuroraVaultContract.connect(alice).approve(liquidityPoolContract.address, aliceSwap);

      const alicePreBalance = await auroraTokenContract.balanceOf(alice.address);
      await liquidityPoolContract.connect(alice).swapStAurforAurora(
        aliceSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(aliceSwap)
      );
      const alicePostBalance = await auroraTokenContract.balanceOf(alice.address);

      var stAurBalanceTracker = stAurBalanceTracker.add(ethers.BigNumber.from("196000000000000000000"));
      var colledtedStAurFeesTracker = colledtedStAurFeesTracker.add(ethers.BigNumber.from("4000000000000000000"));
      expect(await liquidityPoolContract.stAurBalance()).to.equal(stAurBalanceTracker);
      expect(await liquidityPoolContract.colledtedStAurFees()).to.equal(colledtedStAurFeesTracker);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        alicePostBalance.sub(alicePreBalance));
      
      // Bob swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const bobSwap = ethers.BigNumber.from(3_400).mul(decimals);
      await stakedAuroraVaultContract.connect(bob).approve(liquidityPoolContract.address, bobSwap);

      const bobPreBalance = await auroraTokenContract.balanceOf(bob.address);
      await liquidityPoolContract.connect(bob).swapStAurforAurora(
        bobSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(bobSwap)
      );
      const bobPostBalance = await auroraTokenContract.balanceOf(bob.address);

      var stAurBalanceTracker = stAurBalanceTracker.add(ethers.BigNumber.from("3332000000000000000000"));
      var colledtedStAurFeesTracker = colledtedStAurFeesTracker.add(ethers.BigNumber.from("68000000000000000000"));
      expect(await liquidityPoolContract.stAurBalance()).to.equal(stAurBalanceTracker);
      expect(await liquidityPoolContract.colledtedStAurFees()).to.equal(colledtedStAurFeesTracker);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        bobPostBalance.sub(bobPreBalance));

      // Carl swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const carlSwap = ethers.BigNumber.from(132).mul(decimals);
      await stakedAuroraVaultContract.connect(carl).approve(liquidityPoolContract.address, carlSwap);

      const carlPreBalance = await auroraTokenContract.balanceOf(carl.address);
      await liquidityPoolContract.connect(carl).swapStAurforAurora(
        carlSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(carlSwap)
      );
      const carlPostBalance = await auroraTokenContract.balanceOf(carl.address);

      var stAurBalanceTracker = stAurBalanceTracker.add(ethers.BigNumber.from("129360000000000000000"));
      var colledtedStAurFeesTracker = colledtedStAurFeesTracker.add(ethers.BigNumber.from("2640000000000000000"));
      expect(await liquidityPoolContract.stAurBalance()).to.equal(stAurBalanceTracker);
      expect(await liquidityPoolContract.colledtedStAurFees()).to.equal(colledtedStAurFeesTracker);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        carlPostBalance.sub(carlPreBalance));
    });
  });
});