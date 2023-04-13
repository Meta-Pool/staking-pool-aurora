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
  MAX_WITHDRAW_ORDERS,
  TOTAL_SPAMBOTS
} = require("./test_setup");

describe("Emergency flow 🦺", function () {
  describe("Spam bot horde creating withdraw orders", function () {
    it("Should return TOTAL withdraw orders to users.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        liquidity_provider,
        alice,
        bob,
        carl,
        spambots
      } = await loadFixture(botsHordeFixture);

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const liquidityProviderShares = await stakedAuroraVaultContract.balanceOf(liquidity_provider.address);

      var totalBotsShares = ethers.BigNumber.from(0);
      var spamShares = new Array();
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await stakedAuroraVaultContract.balanceOf(spambots[i].address);
        spamShares.push(shares);
        totalBotsShares = totalBotsShares.add(shares);
      }

      expect(await stakedAuroraVaultContract.totalSupply()).to.equal(
        aliceShares.add(bobShares).add(carlShares).add(liquidityProviderShares).add(totalBotsShares)
      );

      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          spamShares[i], spambots[i].address, spambots[i].address
        );
      }

      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
      ).to.be.revertedWith("TOO_MANY_WITHDRAW_ORDERS");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextSpamBalance = (await auroraTokenContract.balanceOf(spambots[0].address)).add(
        await stakingManagerContract.getAvailableAssets(spambots[0].address)
      );
      await stakedAuroraVaultContract.connect(spambots[0]).withdraw(
        await stakingManagerContract.getAvailableAssets(spambots[0].address),
        spambots[0].address,
        spambots[0].address
      );
      expect(await auroraTokenContract.balanceOf(spambots[0].address)).to.equal(nextSpamBalance);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
        await stakingManagerContract.getAvailableAssets(alice.address)
      );
      await stakedAuroraVaultContract.connect(alice).withdraw(
        await stakingManagerContract.getAvailableAssets(alice.address),
        alice.address,
        alice.address
      );
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await stakedAuroraVaultContract.connect(bob).withdraw(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address,
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

      const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
        await stakingManagerContract.getAvailableAssets(carl.address)
      );
      await stakedAuroraVaultContract.connect(carl).withdraw(
        await stakingManagerContract.getAvailableAssets(carl.address),
        carl.address,
        carl.address
      );
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
    });

    it("Should return Partially withdraw orders to users.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl,
        spambots
      } = await loadFixture(botsHordeFixture);

      const redeemBalance = ethers.BigNumber.from(1).mul(DECIMALS);

      // First redeem.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          redeemBalance, spambots[i].address, spambots[i].address
        );
      }

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Second redeem.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          redeemBalance, spambots[i].address, spambots[i].address
        );
      }

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Third redeem.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          redeemBalance, spambots[i].address, spambots[i].address
        );
      }

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Fourth redeem.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          redeemBalance, spambots[i].address, spambots[i].address
        );
      }

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(alice).redeem(redeemBalance, alice.address, alice.address);
      await stakedAuroraVaultContract.connect(bob).redeem(redeemBalance, bob.address, bob.address);
      await stakedAuroraVaultContract.connect(carl).redeem(redeemBalance, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(alice).redeem(redeemBalance, alice.address, alice.address);
      await stakedAuroraVaultContract.connect(bob).redeem(redeemBalance, bob.address, bob.address);
      await stakedAuroraVaultContract.connect(carl).redeem(redeemBalance, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);

      // Redeem ALL bots balances.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await stakedAuroraVaultContract.balanceOf(spambots[i].address);
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          shares, spambots[i].address, spambots[i].address
        );
      }

      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
      ).to.be.revertedWith("TOO_MANY_WITHDRAW_ORDERS");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // After the redeem, let's pull the funds out with a withdraw.
      const nextSpamBalance = (await auroraTokenContract.balanceOf(spambots[0].address)).add(
        await stakingManagerContract.getAvailableAssets(spambots[0].address)
      );
      await stakedAuroraVaultContract.connect(spambots[0]).withdraw(
        await stakingManagerContract.getAvailableAssets(spambots[0].address),
        spambots[0].address,
        spambots[0].address
      );
      expect(await auroraTokenContract.balanceOf(spambots[0].address)).to.equal(nextSpamBalance);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
        await stakingManagerContract.getAvailableAssets(alice.address)
      );
      await stakedAuroraVaultContract.connect(alice).withdraw(
        await stakingManagerContract.getAvailableAssets(alice.address),
        alice.address,
        alice.address
      );
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await stakedAuroraVaultContract.connect(bob).withdraw(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address,
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

      const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
        await stakingManagerContract.getAvailableAssets(carl.address)
      );
      await stakedAuroraVaultContract.connect(carl).withdraw(
        await stakingManagerContract.getAvailableAssets(carl.address),
        carl.address,
        carl.address
      );
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
    });
  });

  describe("Contract is not longer fully operational", function () {
    it("Should not allow users to deposit nor redeem.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        alice,
        bob
      } = await loadFixture(botsHordeFixture);

      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;
      await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.false;

      const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
      await expect(
        stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
      ).to.be.revertedWith("CONTRACT_IS_NOT_FULLY_OPERATIONAL");

      await expect(
        stakedAuroraVaultContract.connect(alice).mint(
          ethers.BigNumber.from(1).mul(DECIMALS), alice.address)
      ).to.be.revertedWith("CONTRACT_IS_NOT_FULLY_OPERATIONAL");

      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(
          await stakedAuroraVaultContract.balanceOf(alice.address), alice.address, alice.address)
      ).to.be.revertedWith("CONTRACT_IS_NOT_FULLY_OPERATIONAL");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await stakedAuroraVaultContract.connect(bob).withdraw(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address,
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);
    });

    it("Should clean withdraw orders.", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        spambots
      } = await loadFixture(botsHordeFixture);

      const totalSupplyBefore = await stakedAuroraVaultContract.totalSupply();
      const totalAssetsBefore = await stakedAuroraVaultContract.totalAssets();

      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await stakedAuroraVaultContract.balanceOf(spambots[i].address);
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          shares, spambots[i].address, spambots[i].address
        );
        expect(await stakedAuroraVaultContract.balanceOf(spambots[i].address)).to.equal(0);
      }

      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(MAX_WITHDRAW_ORDERS);
      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;
      await expect(
        stakingManagerContract.connect(owner).emergencyClearWithdrawOrders(1, MAX_WITHDRAW_ORDERS)
      ).to.be.revertedWith("ONLY_WHEN_VAULT_IS_NOT_FULLY_OP");
      await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.false;
      await stakingManagerContract.connect(owner).emergencyClearWithdrawOrders(1, MAX_WITHDRAW_ORDERS);
      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(0);

      // IMPORTANT: Tests are running against a dummy Aurora Plus contract that increse the
      // Aurora tokens each second. This implies that the totalSupply after the emergency mint
      // should be greater, because each share reprsents now more assets than before the emergency.
      expect(await stakedAuroraVaultContract.totalSupply()).to.be.lessThan(totalSupplyBefore);
      expect(await stakedAuroraVaultContract.totalAssets()).to.be.greaterThan(totalAssetsBefore);

      // ⚠️ Testing the math is tricky, so a simple/loose check is done here! <<<<<<<<<<<<<
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        expect(await stakedAuroraVaultContract.balanceOf(spambots[i].address)).to.be.greaterThan(0);
      }
    });
  });
});