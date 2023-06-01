const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  botsHordeFixture,
  TOTAL_SPAMBOTS,
} = require("./test_setup");

describe("Testing Max Capacity. DOS attack.", function () {
  describe("Correct gas consumption and the Max Capacity hardcoded in the contract.", function () {
    /// max Values established from v0.2.0. Check: `test/_config.js`.
    it("❌ WARNING: For courtesy Max Capacity test are disable. 200 withdraw orders and 20 depositors.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl,
        spambots
      } = await loadFixture(botsHordeFixture);

      // For courtesy, this expect is ignored.
      // expect(TOTAL_SPAMBOTS).to.be.equal(200);

      // WITH it.
      // Correct gas consumption and the Max Capacity hardcoded in the contract.
      // GAS used on clean-orders:  BigNumber { value: "9209204" }
      // GAS used on clean-orders:  BigNumber { value: "2747768" }
      // GAS used on clean-orders:  BigNumber { value: "142252" }
      // WITHOUT the depositor length requirement.
      // Correct gas consumption and the Max Capacity hardcoded in the contract.
      // GAS used on clean-orders:  BigNumber { value: "9209038" }
      // GAS used on clean-orders:  BigNumber { value: "2747635" }
      // GAS used on clean-orders:  BigNumber { value: "142120" }
      const VERBOSE = false;

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
      ).to.be.revertedWithCustomError(stakingManagerContract, "MaxOrdersExceeded");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      var tx = await stakingManagerContract.cleanOrdersQueue();
      var gasUsed = (await tx.wait()).gasUsed;
      if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      var tx = await stakingManagerContract.cleanOrdersQueue();
      var gasUsed = (await tx.wait()).gasUsed;
      if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

      // After the redeem, let's pull the funds out with a withdraw.
      const nextSpamBalance = (await auroraTokenContract.balanceOf(spambots[0].address)).add(
        await stakingManagerContract.getAvailableAssets(spambots[0].address)
      );
      await stakedAuroraVaultContract.connect(spambots[0]).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(spambots[0].address),
        spambots[0].address
      );
      expect(await auroraTokenContract.balanceOf(spambots[0].address)).to.equal(nextSpamBalance);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      var tx = await stakingManagerContract.cleanOrdersQueue();
      var gasUsed = (await tx.wait()).gasUsed;
      if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

      const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
        await stakingManagerContract.getAvailableAssets(alice.address)
      );
      await stakedAuroraVaultContract.connect(alice).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(alice.address),
        alice.address
      );
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

      const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
        await stakingManagerContract.getAvailableAssets(bob.address)
      );
      await stakedAuroraVaultContract.connect(bob).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(bob.address),
        bob.address
      );
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

      const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
        await stakingManagerContract.getAvailableAssets(carl.address)
      );
      await stakedAuroraVaultContract.connect(carl).completeDelayUnstake(
        await stakingManagerContract.getAvailableAssets(carl.address),
        carl.address
      );
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
    });
  });
});
