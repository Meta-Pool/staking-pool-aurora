const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployPoolFixture,
  depositPoolFixture,
  liquidityPoolFixture,
  botsHordeFixture,
  AURORA,
  DECIMALS
} = require("./test_setup");

describe("Emergency flow 🦺 works.", function () {
  describe("Spam bot horde creating withdraw orders.", function () {
    it("Should return TOTAL withdraw orders to users.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        liquidity_provider,
        alice,
        bob,
        carl,
        spam0,
        spam1,
        spam2,
        spam3,
        spam4,
        spam5,
        spam6,
        spam7,
        spam8,
        spam9
      } = await loadFixture(botsHordeFixture);

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const liquidityProviderShares = await stakedAuroraVaultContract.balanceOf(liquidity_provider.address);
      const spam0Shares = await stakedAuroraVaultContract.balanceOf(spam0.address);
      const spam1Shares = await stakedAuroraVaultContract.balanceOf(spam1.address);
      const spam2Shares = await stakedAuroraVaultContract.balanceOf(spam2.address);
      const spam3Shares = await stakedAuroraVaultContract.balanceOf(spam3.address);
      const spam4Shares = await stakedAuroraVaultContract.balanceOf(spam4.address);
      const spam5Shares = await stakedAuroraVaultContract.balanceOf(spam5.address);
      const spam6Shares = await stakedAuroraVaultContract.balanceOf(spam6.address);
      const spam7Shares = await stakedAuroraVaultContract.balanceOf(spam7.address);
      const spam8Shares = await stakedAuroraVaultContract.balanceOf(spam8.address);
      const spam9Shares = await stakedAuroraVaultContract.balanceOf(spam9.address);

      expect(await stakedAuroraVaultContract.totalSupply()).to.equal(
        aliceShares.add(bobShares).add(carlShares).add(liquidityProviderShares).add(spam0Shares)
          .add(spam1Shares).add(spam2Shares).add(spam3Shares).add(spam4Shares).add(spam5Shares)
          .add(spam6Shares).add(spam7Shares).add(spam8Shares).add(spam9Shares)
      );

      await stakedAuroraVaultContract.connect(spam0).redeem(spam0Shares, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(spam1Shares, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(spam2Shares, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(spam3Shares, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(spam4Shares, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(spam5Shares, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(spam6Shares, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(spam7Shares, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(spam8Shares, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(spam9Shares, spam9.address, spam9.address);

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

      const nextSpam0Balance = (await auroraTokenContract.balanceOf(spam0.address)).add(
        await stakingManagerContract.getAvailableAssets(spam0.address)
      );
      await stakedAuroraVaultContract.connect(spam0).withdraw(
        await stakingManagerContract.getAvailableAssets(spam0.address),
        spam0.address,
        spam0.address
      );
      expect(await auroraTokenContract.balanceOf(spam0.address)).to.equal(nextSpam0Balance);

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
        spam0,
        spam1,
        spam2,
        spam3,
        spam4,
        spam5,
        spam6,
        spam7,
        spam8,
        spam9
      } = await loadFixture(botsHordeFixture);

      const redeemBalance = ethers.BigNumber.from(1).mul(DECIMALS);

      await stakedAuroraVaultContract.connect(spam0).redeem(redeemBalance, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(redeemBalance, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(redeemBalance, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(redeemBalance, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(redeemBalance, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(redeemBalance, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(redeemBalance, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(redeemBalance, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(redeemBalance, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(redeemBalance, spam9.address, spam9.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(spam0).redeem(redeemBalance, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(redeemBalance, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(redeemBalance, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(redeemBalance, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(redeemBalance, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(redeemBalance, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(redeemBalance, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(redeemBalance, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(redeemBalance, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(redeemBalance, spam9.address, spam9.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(spam0).redeem(redeemBalance, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(redeemBalance, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(redeemBalance, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(redeemBalance, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(redeemBalance, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(redeemBalance, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(redeemBalance, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(redeemBalance, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(redeemBalance, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(redeemBalance, spam9.address, spam9.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      await stakedAuroraVaultContract.connect(spam0).redeem(redeemBalance, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(redeemBalance, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(redeemBalance, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(redeemBalance, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(redeemBalance, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(redeemBalance, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(redeemBalance, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(redeemBalance, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(redeemBalance, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(redeemBalance, spam9.address, spam9.address);

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
      const spam0Shares = await stakedAuroraVaultContract.balanceOf(spam0.address);
      const spam1Shares = await stakedAuroraVaultContract.balanceOf(spam1.address);
      const spam2Shares = await stakedAuroraVaultContract.balanceOf(spam2.address);
      const spam3Shares = await stakedAuroraVaultContract.balanceOf(spam3.address);
      const spam4Shares = await stakedAuroraVaultContract.balanceOf(spam4.address);
      const spam5Shares = await stakedAuroraVaultContract.balanceOf(spam5.address);
      const spam6Shares = await stakedAuroraVaultContract.balanceOf(spam6.address);
      const spam7Shares = await stakedAuroraVaultContract.balanceOf(spam7.address);
      const spam8Shares = await stakedAuroraVaultContract.balanceOf(spam8.address);
      const spam9Shares = await stakedAuroraVaultContract.balanceOf(spam9.address);

      await stakedAuroraVaultContract.connect(spam0).redeem(spam0Shares, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(spam1Shares, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(spam2Shares, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(spam3Shares, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(spam4Shares, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(spam5Shares, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(spam6Shares, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(spam7Shares, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(spam8Shares, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(spam9Shares, spam9.address, spam9.address);

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

      const nextSpam0Balance = (await auroraTokenContract.balanceOf(spam0.address)).add(
        await stakingManagerContract.getAvailableAssets(spam0.address)
      );
      await stakedAuroraVaultContract.connect(spam0).withdraw(
        await stakingManagerContract.getAvailableAssets(spam0.address),
        spam0.address,
        spam0.address
      );
      expect(await auroraTokenContract.balanceOf(spam0.address)).to.equal(nextSpam0Balance);

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

  describe("Contract is not longer fully operational.", function () {
    it("Should not allow users to deposit nor redeem.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        owner,
        alice,
        bob,
        carl,
        spam0,
        spam1,
        spam2,
        spam3,
        spam4,
        spam5,
        spam6,
        spam7,
        spam8,
        spam9
      } = await loadFixture(botsHordeFixture);

      // const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      // const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      // const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const spam0Shares = await stakedAuroraVaultContract.balanceOf(spam0.address);
      const spam1Shares = await stakedAuroraVaultContract.balanceOf(spam1.address);
      const spam2Shares = await stakedAuroraVaultContract.balanceOf(spam2.address);
      const spam3Shares = await stakedAuroraVaultContract.balanceOf(spam3.address);
      const spam4Shares = await stakedAuroraVaultContract.balanceOf(spam4.address);
      const spam5Shares = await stakedAuroraVaultContract.balanceOf(spam5.address);
      const spam6Shares = await stakedAuroraVaultContract.balanceOf(spam6.address);
      const spam7Shares = await stakedAuroraVaultContract.balanceOf(spam7.address);
      const spam8Shares = await stakedAuroraVaultContract.balanceOf(spam8.address);
      const spam9Shares = await stakedAuroraVaultContract.balanceOf(spam9.address);

      await stakedAuroraVaultContract.connect(spam0).redeem(spam0Shares, spam0.address, spam0.address);
      await stakedAuroraVaultContract.connect(spam1).redeem(spam1Shares, spam1.address, spam1.address);
      await stakedAuroraVaultContract.connect(spam2).redeem(spam2Shares, spam2.address, spam2.address);
      await stakedAuroraVaultContract.connect(spam3).redeem(spam3Shares, spam3.address, spam3.address);
      await stakedAuroraVaultContract.connect(spam4).redeem(spam4Shares, spam4.address, spam4.address);
      await stakedAuroraVaultContract.connect(spam5).redeem(spam5Shares, spam5.address, spam5.address);
      await stakedAuroraVaultContract.connect(spam6).redeem(spam6Shares, spam6.address, spam6.address);
      await stakedAuroraVaultContract.connect(spam7).redeem(spam7Shares, spam7.address, spam7.address);
      await stakedAuroraVaultContract.connect(spam8).redeem(spam8Shares, spam8.address, spam8.address);
      await stakedAuroraVaultContract.connect(spam9).redeem(spam9Shares, spam9.address, spam9.address);

      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;
      await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
      expect(await stakedAuroraVaultContract.fullyOperational()).to.be.false;

      const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
      await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

      //// WIP: start here!

      // // Move forward: From withdraw to pending.
      // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      // await stakingManagerContract.cleanOrdersQueue();

      // await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      // await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      // await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // // Move forward: From pending to available.
      // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      // await stakingManagerContract.cleanOrdersQueue();

      // const nextSpam0Balance = (await auroraTokenContract.balanceOf(spam0.address)).add(
      //   await stakingManagerContract.getAvailableAssets(spam0.address)
      // );
      // await stakedAuroraVaultContract.connect(spam0).withdraw(
      //   await stakingManagerContract.getAvailableAssets(spam0.address),
      //   spam0.address,
      //   spam0.address
      // );
      // expect(await auroraTokenContract.balanceOf(spam0.address)).to.equal(nextSpam0Balance);

      // // Move forward: From pending to available.
      // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      // await stakingManagerContract.cleanOrdersQueue();

      // const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
      //   await stakingManagerContract.getAvailableAssets(alice.address)
      // );
      // await stakedAuroraVaultContract.connect(alice).withdraw(
      //   await stakingManagerContract.getAvailableAssets(alice.address),
      //   alice.address,
      //   alice.address
      // );
      // expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

      // const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
      //   await stakingManagerContract.getAvailableAssets(bob.address)
      // );
      // await stakedAuroraVaultContract.connect(bob).withdraw(
      //   await stakingManagerContract.getAvailableAssets(bob.address),
      //   bob.address,
      //   bob.address
      // );
      // expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

      // const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
      //   await stakingManagerContract.getAvailableAssets(carl.address)
      // );
      // await stakedAuroraVaultContract.connect(carl).withdraw(
      //   await stakingManagerContract.getAvailableAssets(carl.address),
      //   carl.address,
      //   carl.address
      // );
      // expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
    });
  });
});