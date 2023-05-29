const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployPoolFixture,
  liquidityPoolFixture,
  DECIMALS,
  FEE_COLLECTOR_ROLE,
  ADMIN_ROLE,
  OPERATOR_ROLE
} = require("./test_setup");

describe("Liquidity Pool StAUR <> AURORA", function () {
  describe("Deployment", function () {
    it("Should be correct for LP contract initial parameters.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        liquidity_pool_owner,
        stakedAuroraVaultContract,
        fee_collector,
        operator
      } = await loadFixture(deployPoolFixture);

      expect(await liquidityPoolContract.hasRole(ADMIN_ROLE, liquidity_pool_owner.address)).to.be.true;
      expect(await liquidityPoolContract.hasRole(FEE_COLLECTOR_ROLE, fee_collector.address)).to.be.true;
      expect(await liquidityPoolContract.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
      expect(await liquidityPoolContract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await liquidityPoolContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(0);
      expect(await liquidityPoolContract.swapFeeBasisPoints()).to.equal(200);
      expect(await liquidityPoolContract.liqProvFeeCutBasisPoints()).to.equal(8000);
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

  describe("Swap stAUR for Aurora", function () {
    it("Should allow multiple swaps and keep the balances correct.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        stakedAuroraVaultContract,
        liquidity_provider,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      var auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);

      // StAUR deposits to the Liquidity Pool.
      const providerSwap = ethers.BigNumber.from(90_000).mul(DECIMALS); // The amount of stAUR the provider will swap back to AURORA.
      await stakedAuroraVaultContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerSwap);

      const providerPreBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);
      await liquidityPoolContract.connect(liquidity_provider).swapStAurForAurora(
        providerSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(providerSwap)
      );
      const providerPostBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        providerPostBalance.sub(providerPreBalance)
      );

      // Alice swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const aliceSwap = ethers.BigNumber.from(200).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(alice).approve(liquidityPoolContract.address, aliceSwap);

      const alicePreBalance = await auroraTokenContract.balanceOf(alice.address);
      await liquidityPoolContract.connect(alice).swapStAurForAurora(
        aliceSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(aliceSwap)
      );
      const alicePostBalance = await auroraTokenContract.balanceOf(alice.address);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        alicePostBalance.sub(alicePreBalance)
      );

      // Bob swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const bobSwap = ethers.BigNumber.from(3_400).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(bob).approve(liquidityPoolContract.address, bobSwap);

      const bobPreBalance = await auroraTokenContract.balanceOf(bob.address);
      await liquidityPoolContract.connect(bob).swapStAurForAurora(
        bobSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(bobSwap)
      );
      const bobPostBalance = await auroraTokenContract.balanceOf(bob.address);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        bobPostBalance.sub(bobPreBalance)
      );

      // Carl swap.
      var auroraBalanceTracker = await liquidityPoolContract.auroraBalance();
      const carlSwap = ethers.BigNumber.from(132).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(carl).approve(liquidityPoolContract.address, carlSwap);

      const carlPreBalance = await auroraTokenContract.balanceOf(carl.address);
      await liquidityPoolContract.connect(carl).swapStAurForAurora(
        carlSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(carlSwap)
      );
      const carlPostBalance = await auroraTokenContract.balanceOf(carl.address);
      expect(auroraBalanceTracker.sub(await liquidityPoolContract.auroraBalance())).to.equal(
        carlPostBalance.sub(carlPreBalance)
      );
    });

    it("Should generate fee 🪙 for the contract.", async function () {
      const {
        liquidityPoolContract,
        stakedAuroraVaultContract,
        liquidity_provider,
        fee_collector,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(0);

      // StAUR deposits to the Liquidity Pool.
      const providerSwap = ethers.BigNumber.from(90_000).mul(DECIMALS); // The amount of stAUR the provider will swap back to AURORA.
      await stakedAuroraVaultContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerSwap);

      await liquidityPoolContract.connect(liquidity_provider).swapStAurForAurora(
        providerSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(providerSwap)
      );

      var collectedStAurFeesTracker = ethers.BigNumber.from("360000000000000000000");
      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(collectedStAurFeesTracker);

      // Alice swap.
      const aliceSwap = ethers.BigNumber.from(200).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(alice).approve(liquidityPoolContract.address, aliceSwap);

      await liquidityPoolContract.connect(alice).swapStAurForAurora(
        aliceSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(aliceSwap)
      );

      var collectedStAurFeesTracker = collectedStAurFeesTracker.add(ethers.BigNumber.from("800000000000000000"));
      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(collectedStAurFeesTracker);

      // Bob swap.
      const bobSwap = ethers.BigNumber.from(3_400).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(bob).approve(liquidityPoolContract.address, bobSwap);

      await liquidityPoolContract.connect(bob).swapStAurForAurora(
        bobSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(bobSwap)
      );

      var collectedStAurFeesTracker = collectedStAurFeesTracker.add(ethers.BigNumber.from("13600000000000000000"));
      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(collectedStAurFeesTracker);

      // Carl swap.
      const carlSwap = ethers.BigNumber.from(132).mul(DECIMALS);
      await stakedAuroraVaultContract.connect(carl).approve(liquidityPoolContract.address, carlSwap);

      await liquidityPoolContract.connect(carl).swapStAurForAurora(
        carlSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(carlSwap)
      );

      var collectedStAurFeesTracker = collectedStAurFeesTracker.add(ethers.BigNumber.from("528000000000000000"));
      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(collectedStAurFeesTracker);

      const aliceBalancePre = await stakedAuroraVaultContract.balanceOf(alice.address);
      await expect(
        liquidityPoolContract.connect(alice).withdrawCollectedStAurFees(alice.address)
      ).to.be.revertedWith("AccessControl: account 0x14dc79964da2c08b23698b3d3cc7ca32193d9955 is missing role 0x2dca0f5ce7e75a4b43fe2b0d6f5d0b7a2bf92ecf89f8f0aa17b8308b67038821");
      await liquidityPoolContract.connect(fee_collector).withdrawCollectedStAurFees(alice.address);
      expect(await liquidityPoolContract.collectedStAurFees()).to.equal(0);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(
        aliceBalancePre.add(collectedStAurFeesTracker)
      );
    });
  });

  describe("Remove (REDEEM) and add (DEPOSIT) liquidity", function () {
    // For version v0.2.0, the liquidity pool should be compatible with the ERC4626 standard.
    // it("Should FAIL for mint 🦗 and withdraw functions.", async function () {
    //   const {
    //     liquidityPoolContract,
    //     alice
    //   } = await loadFixture(deployPoolFixture);

    //   await expect(
    //     liquidityPoolContract.mint(10, alice.address)
    //   ).to.be.revertedWithCustomError(liquidityPoolContract, "UnavailableFunction");

    //   await expect(
    //     liquidityPoolContract.withdraw(10, alice.address, alice.address)
    //   ).to.be.revertedWithCustomError(liquidityPoolContract, "UnavailableFunction");
    // });

    it("Should EMPTY 🫗 the Liquidity Pool using `redeem`.", async function () {
      const {
        liquidityPoolContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      // IMPORTANT VALUES:
      // The initial state of the contract is 0 stAUR, and 1_000_000 Aurora. All LP Tokens are
      // with the liquidity_provider account.
      const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(
        await liquidityPoolContract.balanceOf(liquidity_provider.address)
      );

      await liquidityPoolContract.connect(liquidity_provider).redeem(
        await liquidityPoolContract.balanceOf(liquidity_provider.address),
        liquidity_provider.address,
        liquidity_provider.address
      );
    });

    it("Should EMPTY 🫗 the Liquidity Pool using `withdraw`.", async function () {
        const {
          liquidityPoolContract,
          liquidity_provider
        } = await loadFixture(liquidityPoolFixture);

        // IMPORTANT VALUES:
        // The initial state of the contract is 0 stAUR, and 1_000_000 Aurora. All LP Tokens are
        // with the liquidity_provider account.
        const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
        expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
        expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
        expect(await liquidityPoolContract.totalSupply()).to.equal(
          await liquidityPoolContract.balanceOf(liquidity_provider.address)
        );

        await liquidityPoolContract.connect(liquidity_provider).withdraw(
          await liquidityPoolContract.convertToAssets(
            await liquidityPoolContract.balanceOf(liquidity_provider.address)
          ),
          liquidity_provider.address,
          liquidity_provider.address
        );

      expect(await liquidityPoolContract.auroraBalance()).to.equal(0);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(0);
    });

    it("Should NOT allow to `redeem` 0 shares.", async function () {
      const {
        liquidityPoolContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      await expect(liquidityPoolContract.connect(liquidity_provider).redeem(
        0,
        liquidity_provider.address,
        liquidity_provider.address
      )).to.be.revertedWithCustomError(liquidityPoolContract, "InvalidZeroAmount");

      const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(
        await liquidityPoolContract.balanceOf(liquidity_provider.address)
      );
    });

    it("Should NOT allow to `withdraw` 0 assets.", async function () {
      const {
        liquidityPoolContract,
        liquidity_provider
      } = await loadFixture(liquidityPoolFixture);

      await expect(liquidityPoolContract.connect(liquidity_provider).withdraw(
        0,
        liquidity_provider.address,
        liquidity_provider.address
      )).to.be.revertedWithCustomError(liquidityPoolContract, "InvalidZeroAmount");

      const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(
        await liquidityPoolContract.balanceOf(liquidity_provider.address)
      );
    });

    it("Should NOT allow `redeem` to accounts without LP tokens.", async function () {
      const {
        liquidityPoolContract,
        liquidity_provider,
        alice
      } = await loadFixture(liquidityPoolFixture);

      await expect(liquidityPoolContract.connect(alice).redeem(
        ethers.BigNumber.from(1_000).mul(DECIMALS),
        alice.address,
        alice.address
      )).to.be.revertedWith("ERC4626: redeem more than max");

      const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(
        await liquidityPoolContract.balanceOf(liquidity_provider.address)
      );
    });

    it("Should NOT allow `withdraw` to accounts without LP tokens.", async function () {
      const {
        liquidityPoolContract,
        liquidity_provider,
        alice
      } = await loadFixture(liquidityPoolFixture);

      await expect(liquidityPoolContract.connect(alice).withdraw(
        ethers.BigNumber.from(1_000).mul(DECIMALS),
        alice.address,
        alice.address
      )).to.be.revertedWith("ERC4626: withdraw more than max");

      const auroraBalanceTracker = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(auroraBalanceTracker);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.totalSupply()).to.equal(
        await liquidityPoolContract.balanceOf(liquidity_provider.address)
      );
    });
  });
});