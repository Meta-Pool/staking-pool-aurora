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

describe("Router 🛜 : one router, two vaults", function () {
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

    /// @notice Not for release v0.2.0.
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

    /// @notice Not for release v0.2.0.
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
        RouterContract,
        alice
      } = await loadFixture(depositPoolFixture);

      // Base asset token Ops
      const aliceAssetsToWithdraw = ethers.BigNumber.from(700).mul(DECIMALS);
      const aliceExpectsB = await auroraTokenContract.balanceOf(alice.address);

      // console.log("Alice expects shares: %s: ", aliceExpectsB);
      // console.log("Alice shares balance: %s: ", await stakedAuroraVaultContract.balanceOf(alice.address));

      // Shares Ops
      const _maxSharesOut = ethers.BigNumber.from(701).mul(DECIMALS);
      const aliceExpectsA = (await stakedAuroraVaultContract.balanceOf(alice.address)).sub(_maxSharesOut);

      // console.log("Alice expects assets: %s: ", aliceExpectsA);
      // console.log("Alice assets balance: %s: ", await auroraTokenContract.balanceOf(alice.address));

      await stakedAuroraVaultContract.connect(alice).approve(
        RouterContract.address,
        _maxSharesOut
      );
      await RouterContract.connect(alice).withdrawFromVault(
        stakedAuroraVaultContract.address,
        alice.address,
        aliceAssetsToWithdraw,
        _maxSharesOut
      );
      // This test should exclude the _minAmountOut, because the delay of 2 days for delay-unstake operations.
      expect(await auroraTokenContract.balanceOf(alice.address)).to.be.equal(aliceExpectsB);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.be.greaterThan(aliceExpectsA);
    });
  });

  describe("Avoid slippage ⛸️ for: deposit, mint, redeem and withdraw from stAUR vault", function () {
    it("Should allow safe deposit.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        RouterContract,
        bob
      } = await loadFixture(depositPoolFixture);

      const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
      const bobMinShares = ethers.BigNumber.from(199_999).mul(DECIMALS);
      await auroraTokenContract.connect(bob).approve(RouterContract.address, bobDeposit);
      await expect(RouterContract.connect(bob).depositToVault(
        stakedAuroraVaultContract.address,
        bob.address,
        bobDeposit,
        bobMinShares
      )).to.revertedWithCustomError(RouterContract, "MinSharesError");
    });

    it("Should allow safe mint.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        RouterContract,
        carl
      } = await loadFixture(depositPoolFixture);

      const carlMint = ethers.BigNumber.from(24_000).mul(DECIMALS);
      const carlApprove = ethers.BigNumber.from(30_000).mul(DECIMALS);
      const carlMaxAssets = ethers.BigNumber.from(20_100).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(
        RouterContract.address,
        carlApprove
      );
      await expect(RouterContract.connect(carl).mintToVault(
        stakedAuroraVaultContract.address,
        carl.address,
        carlMint,
        carlMaxAssets
      )).to.revertedWithCustomError(RouterContract, "MaxAmountError");
    });

    it("Should allow safe redeem.", async function () {
      const {
        stakedAuroraVaultContract,
        RouterContract,
        alice
      } = await loadFixture(depositPoolFixture);

      // Shares Ops
      const aliceSharesToRedeem = ethers.BigNumber.from(400).mul(DECIMALS);

      // Base asset token Ops
      const _minAmountOut = ethers.BigNumber.from(402).mul(DECIMALS);

      await stakedAuroraVaultContract.connect(alice).approve(
        RouterContract.address,
        aliceSharesToRedeem
      );
      await expect(RouterContract.connect(alice).redeemFromVault(
        stakedAuroraVaultContract.address,
        alice.address,
        aliceSharesToRedeem,
        _minAmountOut
      )).to.revertedWithCustomError(RouterContract, "MinAmountError");
    });

    it("Should allow safe withdraw.", async function () {
      const {
        stakedAuroraVaultContract,
        RouterContract,
        alice
      } = await loadFixture(depositPoolFixture);

      // Base asset token Ops
      const aliceAssetsToWithdraw = ethers.BigNumber.from(700).mul(DECIMALS);

      // Shares Ops
      const _maxSharesOut = ethers.BigNumber.from(699).mul(DECIMALS);
      const aliceApprove = ethers.BigNumber.from(701).mul(DECIMALS);

      await stakedAuroraVaultContract.connect(alice).approve(
        RouterContract.address,
        aliceApprove
      );
      await expect(RouterContract.connect(alice).withdrawFromVault(
        stakedAuroraVaultContract.address,
        alice.address,
        aliceAssetsToWithdraw,
        _maxSharesOut
      )).to.revertedWithCustomError(RouterContract, "MaxSharesError");
    });
  });

  describe("Deposit, mint, redeem and withdraw from Liquidity Pool 🎱 vault", function () {
    it("Should allow deposit from the router.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      const DEPOSIT = ethers.BigNumber.from(100_000).mul(DECIMALS);
      const MIN_SHARES = ethers.BigNumber.from(99_999).mul(DECIMALS);
      const EXPECTS = (await liquidityPoolContract.balanceOf(liquidity_provider.address)).add(MIN_SHARES);

      await auroraTokenContract.connect(liquidity_provider).approve(RouterContract.address, DEPOSIT);
      await RouterContract.connect(liquidity_provider).depositToVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        DEPOSIT,
        MIN_SHARES
      );
      expect(await liquidityPoolContract.balanceOf(liquidity_provider.address)).to.be.greaterThan(EXPECTS);
    });

    it("Should allow mint from the router.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      const MINT = ethers.BigNumber.from(24_000).mul(DECIMALS);
      const APPROVE = ethers.BigNumber.from(30_000).mul(DECIMALS);
      const MAX_ASSETS = ethers.BigNumber.from(24_100).mul(DECIMALS);
      const EXPECTS = (await liquidityPoolContract.balanceOf(liquidity_provider.address)).add(MINT);

      await auroraTokenContract.connect(liquidity_provider).approve(
        RouterContract.address,
        APPROVE
      );
      await RouterContract.connect(liquidity_provider).mintToVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        MINT,
        MAX_ASSETS
      );
      expect(await liquidityPoolContract.balanceOf(liquidity_provider.address)).to.be.equal(EXPECTS);
    });

    it("Should allow redeem from the router.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      // Shares Ops
      const SHARES_TO_REDEEM = ethers.BigNumber.from(400).mul(DECIMALS);
      const EXPECTS_B = (await liquidityPoolContract.balanceOf(liquidity_provider.address)).sub(SHARES_TO_REDEEM);

      // console.log("liquidity_provider expects shares: %s: ", EXPECTS_B);
      // console.log("liquidity_provider shares balance: %s: ", await liquidityPoolContract.balanceOf(liquidity_provider.address));

      // Base asset token Ops
      const MIN_AMOUNT_OUT = ethers.BigNumber.from(399).mul(DECIMALS);
      const EXPECTS_A = await auroraTokenContract.balanceOf(liquidity_provider.address);

      // console.log("liquidity_provider expects assets: %s: ", EXPECTS_A);
      // console.log("liquidity_provider assets balance: %s: ", await auroraTokenContract.balanceOf(liquidity_provider.address));

      await liquidityPoolContract.connect(liquidity_provider).approve(
        RouterContract.address,
        SHARES_TO_REDEEM
      );
      await RouterContract.connect(liquidity_provider).redeemFromVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        SHARES_TO_REDEEM,
        MIN_AMOUNT_OUT
      );
      expect(await liquidityPoolContract.balanceOf(liquidity_provider.address)).to.be.equal(EXPECTS_B);
      // This test should exclude the _minAmountOut, because the delay of 2 days for delay-unstake operations.
      expect(await auroraTokenContract.balanceOf(liquidity_provider.address)).to.be.greaterThan(EXPECTS_A);
    });

    it("Should allow withdraw from the router.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      // Base asset token Ops
      const ASSETS_TO_WITHDRAW = ethers.BigNumber.from(700).mul(DECIMALS);
      const EXPECTS_B = await auroraTokenContract.balanceOf(liquidity_provider.address);

      // console.log("liquidity_provider expects shares: %s: ", EXPECTS_B);
      // console.log("liquidity_provider shares balance: %s: ", await liquidityPoolContract.balanceOf(liquidity_provider.address));

      // Shares Ops
      const MAX_SHARES_OUT = ethers.BigNumber.from(701).mul(DECIMALS);
      const EXPECTS_A = (await liquidityPoolContract.balanceOf(liquidity_provider.address)).sub(MAX_SHARES_OUT);

      // console.log("liquidity_provider expects assets: %s: ", EXPECTS_A);
      // console.log("liquidity_provider assets balance: %s: ", await auroraTokenContract.balanceOf(liquidity_provider.address));

      await liquidityPoolContract.connect(liquidity_provider).approve(
        RouterContract.address,
        MAX_SHARES_OUT
      );
      await RouterContract.connect(liquidity_provider).withdrawFromVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        ASSETS_TO_WITHDRAW,
        MAX_SHARES_OUT
      );
      // This test should exclude the _minAmountOut, because the delay of 2 days for delay-unstake operations.
      expect(await auroraTokenContract.balanceOf(liquidity_provider.address)).to.be.greaterThan(EXPECTS_B);
      expect(await liquidityPoolContract.balanceOf(liquidity_provider.address)).to.be.greaterThan(EXPECTS_A);
    });
  });

  describe("Avoid slippage ⛸️ for: deposit, mint, redeem and withdraw from Liquidity Pool 🎱 vault", function () {
    it("Should allow safe deposit.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      const DEPOSIT = ethers.BigNumber.from(100_000).mul(DECIMALS);
      const MIN_SHARES = ethers.BigNumber.from(199_999).mul(DECIMALS);
      await auroraTokenContract.connect(liquidity_provider).approve(RouterContract.address, DEPOSIT);
      await expect(RouterContract.connect(liquidity_provider).depositToVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        DEPOSIT,
        MIN_SHARES
      )).to.revertedWithCustomError(RouterContract, "MinSharesError");
    });

    it("Should allow safe mint.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      const MINT = ethers.BigNumber.from(24_000).mul(DECIMALS);
      const APPROVE = ethers.BigNumber.from(30_000).mul(DECIMALS);
      const MAX_ASSETS = ethers.BigNumber.from(20_100).mul(DECIMALS);
      await auroraTokenContract.connect(liquidity_provider).approve(
        RouterContract.address,
        APPROVE
      );
      await expect(RouterContract.connect(liquidity_provider).mintToVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        MINT,
        MAX_ASSETS
      )).to.revertedWithCustomError(RouterContract, "MaxAmountError");
    });

    it("Should allow safe redeem.", async function () {
      const {
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      // Shares Ops
      const SHARES_TO_REDEEM = ethers.BigNumber.from(400).mul(DECIMALS);

      // Base asset token Ops
      const MIN_AMOUNT_OUT = ethers.BigNumber.from(402).mul(DECIMALS);

      await liquidityPoolContract.connect(liquidity_provider).approve(
        RouterContract.address,
        SHARES_TO_REDEEM
      );
      await expect(RouterContract.connect(liquidity_provider).redeemFromVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        SHARES_TO_REDEEM,
        MIN_AMOUNT_OUT
      )).to.revertedWithCustomError(RouterContract, "MinAmountError");
    });

    it("Should allow safe withdraw.", async function () {
      const {
        liquidityPoolContract,
        RouterContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      // Base asset token Ops
      const ASSETS_TO_WITHDRAW = ethers.BigNumber.from(700).mul(DECIMALS);

      // Shares Ops
      const MAX_SHARES_OUT = ethers.BigNumber.from(699).mul(DECIMALS);
      const APPROVE = ethers.BigNumber.from(701).mul(DECIMALS);

      await liquidityPoolContract.connect(liquidity_provider).approve(
        RouterContract.address,
        APPROVE
      );
      await expect(RouterContract.connect(liquidity_provider).withdrawFromVault(
        liquidityPoolContract.address,
        liquidity_provider.address,
        ASSETS_TO_WITHDRAW,
        MAX_SHARES_OUT
      )).to.revertedWithCustomError(RouterContract, "MaxSharesError");
    });
  });
});