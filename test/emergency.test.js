const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  botsHordeFixture,
  DECIMALS,
  MAX_WITHDRAW_ORDERS,
  TOTAL_SPAMBOTS
} = require("./test_setup");

describe("Emergency flow 🦺", function () {
  describe("Spam bot horde creating withdraw orders", function () {
    it("Should return TOTAL withdraw orders to users.", async function () {
      const {
        auroraTokenContract,
        StakedAuroraVaultContract,
        stakingManagerContract,
        liquidity_provider,
        alice,
        bob,
        carl,
        spambots
      } = await loadFixture(botsHordeFixture);

      const aliceShares = await StakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await StakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await StakedAuroraVaultContract.balanceOf(carl.address);
      const liquidityProviderShares = await StakedAuroraVaultContract.balanceOf(liquidity_provider.address);

      var totalBotsShares = ethers.BigNumber.from(0);
      var spamShares = new Array();
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await StakedAuroraVaultContract.balanceOf(spambots[i].address);
        spamShares.push(shares);
        totalBotsShares = totalBotsShares.add(shares);
      }

      expect(await StakedAuroraVaultContract.totalSupply()).to.equal(
        aliceShares.add(bobShares).add(carlShares).add(liquidityProviderShares).add(totalBotsShares)
      );

      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await StakedAuroraVaultContract.connect(spambots[i]).redeem(
          spamShares[i], spambots[i].address, spambots[i].address
        );
      }

      await expect(
        StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
      ).to.be.revertedWithCustomError(stakingManagerContract, "MaxOrdersExceeded");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await StakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await StakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextSpamBalance = (await auroraTokenContract.balanceOf(spambots[0].address)).add(
        await stakingManagerContract.getAvailableAssets(spambots[0].address)
      );
      await StakedAuroraVaultContract.connect(spambots[0]).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(spambots[0].address),
        spambots[0].address
      );
      expect(await auroraTokenContract.balanceOf(spambots[0].address)).to.equal(nextSpamBalance);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
        await stakingManagerContract.getAvailableAssets(alice.address)
      );
      await StakedAuroraVaultContract.connect(alice).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(alice.address),
        alice.address
      );
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await StakedAuroraVaultContract.connect(bob).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

      const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
        await stakingManagerContract.getAvailableAssets(carl.address)
      );
      await StakedAuroraVaultContract.connect(carl).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(carl.address),
        carl.address
      );
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
    });
  });

  // v0.2 is no longer whitelisted.
  // describe("Bulk White 🐻‍❄️ and Black 🐈‍⬛ listing", function () {
  //   it("Should work properly.", async function () {
  //     const {
  //       StakedAuroraVaultContract,
  //       operator,
  //       spambots
  //     } = await loadFixture(botsHordeFixture);

  //     // expect(await StakedAuroraVaultContract.enforceWhitelist()).to.be.false;
  //     // await StakedAuroraVaultContract.connect(operator).updateEnforceWhitelist(true);
  //     // expect(await StakedAuroraVaultContract.enforceWhitelist()).to.be.true;

  //     const accounts = [];
  //     for (let i = 0; i < spambots.length; i++) {
  //       expect(await StakedAuroraVaultContract.isWhitelisted(spambots[i].address)).to.be.false;
  //       accounts.push(spambots[i].address);
  //     }

  //     await StakedAuroraVaultContract.connect(operator).bulkWhitelistAccount(accounts);
  //     for (let i = 0; i < spambots.length; i++) {
  //       expect(await StakedAuroraVaultContract.isWhitelisted(spambots[i].address)).to.be.true;
  //     }

  //     await StakedAuroraVaultContract.connect(operator).bulkBlacklistAccount(accounts);
  //     for (let i = 0; i < spambots.length; i++) {
  //       expect(await StakedAuroraVaultContract.isWhitelisted(spambots[i].address)).to.be.false;
  //     }
  //   });
  // });

  describe("Contract is not longer fully operational", function () {
    it("Should pause all deposits and redeems from the StakedAuroraVault contract.", async function () {
      const {
        auroraTokenContract,
        StakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        alice,
        bob
      } = await loadFixture(botsHordeFixture);

      const bobShares = await StakedAuroraVaultContract.balanceOf(bob.address);
      await StakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      expect(await StakedAuroraVaultContract.fullyOperational()).to.be.true;
      await StakedAuroraVaultContract.connect(owner).updateContractOperation(false);
      expect(await StakedAuroraVaultContract.fullyOperational()).to.be.false;

      const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(StakedAuroraVaultContract.address, aliceDeposit);
      await expect(
        StakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
      ).to.be.revertedWithCustomError(StakedAuroraVaultContract, "NotFullyOperational");

      await expect(
        StakedAuroraVaultContract.connect(alice).mint(
          ethers.BigNumber.from(1).mul(DECIMALS), alice.address)
      ).to.be.revertedWithCustomError(StakedAuroraVaultContract, "NotFullyOperational");

      await expect(
        StakedAuroraVaultContract.connect(alice).redeem(
          await StakedAuroraVaultContract.balanceOf(alice.address), alice.address, alice.address)
      ).to.be.revertedWithCustomError(StakedAuroraVaultContract, "NotFullyOperational");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await StakedAuroraVaultContract.connect(bob).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);
    });

    it ("Should clean all orders, stopWithdrawOrders 🛑.", async function () {
      const {
        StakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        alice,
        bob,
        carl,
        spambots
      } = await loadFixture(botsHordeFixture);

      const aliceShares = await StakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await StakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await StakedAuroraVaultContract.balanceOf(carl.address);

      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await StakedAuroraVaultContract.balanceOf(spambots[i].address);
        await StakedAuroraVaultContract.connect(spambots[i]).redeem(
          shares, spambots[i].address, spambots[i].address
        );
      }

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await StakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await StakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // STOP Processing Withdraw Orders.
      await stakingManagerContract.connect(owner).stopProcessingWithdrawOrders(true);
      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(3);
      expect(await stakingManagerContract.getTotalPendingOrders()).to.equal(MAX_WITHDRAW_ORDERS);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(3);
      expect(await stakingManagerContract.getTotalPendingOrders()).to.equal(0);

      await stakingManagerContract.connect(owner).stopProcessingWithdrawOrders(false);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(0);
      expect(await stakingManagerContract.getTotalPendingOrders()).to.equal(3);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(0);
      expect(await stakingManagerContract.getTotalPendingOrders()).to.equal(0);
    });

    it("Should allow alternative withdraw after Manager detachment.", async function () {
      const {
        auroraTokenContract,
        StakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        alice,
        bob,
        carl
      } = await loadFixture(botsHordeFixture);

      const aliceShares = await StakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await StakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await StakedAuroraVaultContract.balanceOf(carl.address);

      await StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await StakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await StakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // All good for alice.
      await StakedAuroraVaultContract.connect(alice).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(alice.address),
        alice.address
      );

      await expect(
        stakingManagerContract.connect(bob).alternativeWithdraw(
          await stakingManagerContract.getAvailableAssets(bob.address),
          bob.address
        )
      ).to.be.revertedWithCustomError(stakingManagerContract, "VaultAndManagerStillAttached");

      // DETACHING ✂️ Vault and Manager. // Now the owner address is the Manager.
      await StakedAuroraVaultContract.connect(owner).updateStakingManager(owner.address);

      // Too late for bob.
      await expect(
        StakedAuroraVaultContract.connect(bob).completeDelayUnstake(
          await stakingManagerContract.getAvailableAssets(bob.address),
          bob.address
        )
      ).to.be.reverted;

      const bobAvailable = await stakingManagerContract.getAvailableAssets(bob.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      await stakingManagerContract.connect(bob).alternativeWithdraw(
        bobAvailable,
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(bobAvailable.add(bobBalance));
    });
  });
});