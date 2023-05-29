const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployPoolFixture,
  depositPoolFixture,
  liquidityPoolFixture,
  botsHordeFixture,
  AURORA,
  DECIMALS,
  TOTAL_SPAMBOTS,
  ADMIN_ROLE,
  OPERATOR_ROLE,
  COLLECT_REWARDS_ROLE
} = require("./test_setup");

describe("Router 🛜 one router, two vaults", function () {
  describe("Deposit, mint, redeem and withdraw from stAUR vault", function () {
    it("Should allow deposit from the router.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        RouterContract,
        bob
      } = await loadFixture(depositPoolFixture);

      const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
      const bobMinShares = ethers.BigNumber.from(99_999).mul(DECIMALS);
      const bobExpects = (await stakedAuroraVaultContract.balanceOf(bob.address)).add(bobMinShares);
      await auroraTokenContract.connect(bob).approve(RouterContract.address, bobDeposit);
      await RouterContract.connect(bob).depositToVault(
        stakedAuroraVaultContract.address,
        bob.address,
        bobDeposit,
        bobMinShares
      );
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.be.greaterThan(bobExpects);
    });

    // it("Should allow deposit MAX from the router.", async function () {
    //   const {
    //     auroraTokenContract,
    //     // auroraStakingContract,
    //     stakedAuroraVaultContract,
    //     stakingManagerContract,
    //     RouterContract,
    //     alice,
    //     bob,
    //     carl
    //   } = await loadFixture(depositPoolFixture);

    //   // const rlMint = ethers.BigNumber.from(24_000).mul(DECIMALS);
    //   const aliceApprove = ethers.BigNumber.from(400).mul(DECIMALS);
    //   // const carlMaxAssets = ethers.BigNumber.from(24_100).mul(DECIMALS);
    //   // const carlExpects = (await stakedAuroraVaultContract.balanceOf(carl.address)).add(carlMint);
    //   await auroraTokenContract.connect(alice).approve(
    //     RouterContract.address,
    //     aliceApprove
    //   );
    //   await RouterContract.connect(carl).redeemFromVault(
    //     stakedAuroraVaultContract.address,
    //     carl.address,
    //     carlMint,
    //     carlMaxAssets
    //   );
    //   expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.equal(carlExpects);
    //   expect(1).to.be.equal(0);
    // });

    it("Should allow mint from the router.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        RouterContract,
        carl
      } = await loadFixture(depositPoolFixture);

      const carlMint = ethers.BigNumber.from(24_000).mul(DECIMALS);
      const carlApprove = ethers.BigNumber.from(30_000).mul(DECIMALS);
      const carlMaxAssets = ethers.BigNumber.from(24_100).mul(DECIMALS);
      const carlExpects = (await stakedAuroraVaultContract.balanceOf(carl.address)).add(carlMint);
      await auroraTokenContract.connect(carl).approve(
        RouterContract.address,
        carlApprove
      );
      await RouterContract.connect(carl).mintToVault(
        stakedAuroraVaultContract.address,
        carl.address,
        carlMint,
        carlMaxAssets
      );
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.equal(carlExpects);
    });

    it("Should allow redeem from the router.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        RouterContract,
        alice
      } = await loadFixture(depositPoolFixture);

      // Shares Ops
      const aliceSharesToRedeem = ethers.BigNumber.from(400).mul(DECIMALS);
      const aliceExpectsB = (await stakedAuroraVaultContract.balanceOf(alice.address)).sub(aliceSharesToRedeem);

      // console.log("Alice expects shares: %s: ", aliceExpectsB);
      // console.log("Alice shares balance: %s: ", await stakedAuroraVaultContract.balanceOf(alice.address));

      // Base asset token Ops
      const _minAmountOut = ethers.BigNumber.from(399).mul(DECIMALS);
      const aliceExpectsA = await auroraTokenContract.balanceOf(alice.address);

      // console.log("Alice expects assets: %s: ", aliceExpectsA);
      // console.log("Alice assets balance: %s: ", await auroraTokenContract.balanceOf(alice.address));

      await stakedAuroraVaultContract.connect(alice).approve(
        RouterContract.address,
        aliceSharesToRedeem
      );
      await RouterContract.connect(alice).redeemFromVault(
        stakedAuroraVaultContract.address,
        alice.address,
        aliceSharesToRedeem,
        _minAmountOut
      );
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.be.equal(aliceExpectsB);
      // This test should exclude the _minAmountOut, because the delay of 2 days for delay-unstake operations.
      expect(await auroraTokenContract.balanceOf(alice.address)).to.be.equal(aliceExpectsA);
    });

    // it("Should allow redeem MAX from the router.", async function () {
    //   const {
    //     auroraTokenContract,
    //     // auroraStakingContract,
    //     stakedAuroraVaultContract,
    //     stakingManagerContract,
    //     RouterContract,
    //     alice,
    //     bob,
    //     carl
    //   } = await loadFixture(depositPoolFixture);

    //   // const rlMint = ethers.BigNumber.from(24_000).mul(DECIMALS);
    //   const aliceApprove = ethers.BigNumber.from(400).mul(DECIMALS);
    //   // const carlMaxAssets = ethers.BigNumber.from(24_100).mul(DECIMALS);
    //   // const carlExpects = (await stakedAuroraVaultContract.balanceOf(carl.address)).add(carlMint);
    //   await auroraTokenContract.connect(alice).approve(
    //     RouterContract.address,
    //     aliceApprove
    //   );
    //   await RouterContract.connect(carl).redeemFromVault(
    //     stakedAuroraVaultContract.address,
    //     carl.address,
    //     carlMint,
    //     carlMaxAssets
    //   );
    //   expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.equal(carlExpects);
    //   expect(1).to.be.equal(0);
    // });

    it("Should allow withdraw from the router.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        RouterContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      // const rlMint = ethers.BigNumber.from(24_000).mul(DECIMALS);
      const aliceWithdraw = ethers.BigNumber.from(400).mul(DECIMALS);
      const aliceMaxSharesOut = ethers.BigNumber.from(400).mul(DECIMALS);
      // const carlMaxAssets = ethers.BigNumber.from(24_100).mul(DECIMALS);
      const aliceExpects = (await stakedAuroraVaultContract.balanceOf(alice.address)).sub(aliceMaxSharesOut);
      await auroraTokenContract.connect(alice).approve(
        RouterContract.address,
        aliceWithdraw
      );
      await RouterContract.connect(alice).withdrawFromVault(
        stakedAuroraVaultContract.address,
        alice.address,
        aliceWithdraw,
        aliceMaxSharesOut
      );
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.be.greaterThan(aliceExpects);
      expect(1).to.be.equal(0);
    });
  });
});