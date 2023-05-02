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

describe("Staking Pool AURORA", function () {
  describe("Deployment", function () {
    it("Should be correct for all contracts initial parameters.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        owner,
        depositors_owner,
        operator,
        reward_collector
      } = await loadFixture(deployPoolFixture);

      expect(await stakedAuroraVaultContract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await stakedAuroraVaultContract.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
      expect(await stakedAuroraVaultContract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await stakedAuroraVaultContract.asset()).to.equal(auroraTokenContract.address);
      expect(await stakedAuroraVaultContract.totalAssets()).to.equal(0);

      expect(await stakingManagerContract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await stakingManagerContract.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
      expect(await stakingManagerContract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await stakingManagerContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await stakingManagerContract.auroraStaking()).to.equal(auroraStakingContract.address);
      expect(await stakingManagerContract.getDepositorsLength()).to.equal(2);
      expect(await stakingManagerContract.totalAssets()).to.equal(0);

      expect(await depositor00Contract.hasRole(ADMIN_ROLE, depositors_owner.address)).to.be.true;
      expect(await depositor00Contract.hasRole(COLLECT_REWARDS_ROLE, reward_collector.address)).to.be.true;
      expect(await depositor00Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor00Contract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await depositor00Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor00Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await depositor01Contract.hasRole(ADMIN_ROLE, depositors_owner.address)).to.be.true;
      expect(await depositor01Contract.hasRole(COLLECT_REWARDS_ROLE, reward_collector.address)).to.be.true;
      expect(await depositor01Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor01Contract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await depositor01Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor01Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await auroraTokenContract.decimals()).to.equal(
        await stakedAuroraVaultContract.decimals());
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob and Carl.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        liquidity_provider,
        alice,
        bob,
        carl
      } = await loadFixture(deployPoolFixture);

      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      const stakingBalance = await auroraTokenContract.balanceOf(auroraStakingContract.address);
      const liquidityBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);
      expect(await auroraTokenContract.totalSupply()).to.equal(
        aliceBalance.add(bobBalance).add(carlBalance).add(stakingBalance).add(liquidityBalance));
    });
  });

  describe("Staking Aurora tokens", function () {
    it("Should allow deposits from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl
      } = await loadFixture(deployPoolFixture);

      const aliceDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
      await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(aliceDeposit)
      );
      // First deposit is equal to the deposited asset.
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      // First deposit must go ALL to Depositor 01.
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.equal(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.equal(0);

      const bobDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
      await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
      await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(bobDeposit)
      );
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.be.lessThan(bobDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.be.greaterThan(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.equal(bobDeposit);

      const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(carlDeposit)
      );
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.lessThan(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.be.greaterThan(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.greaterThan(bobDeposit.add(carlDeposit));
    });

    it("Should allow minting from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl
      } = await loadFixture(deployPoolFixture);

      // CONSIDER: since the testing-aurora-staking is being revalued every second,
      // we need to approve more tokens than the returned by previewMint.
      const extraToken = ethers.BigNumber.from(1).mul(DECIMALS);

      const aliceMint = ethers.BigNumber.from(1).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(aliceMint.add(extraToken)));
      await stakedAuroraVaultContract.connect(alice).mint(aliceMint, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceMint);
      // First deposit is equal to the deposited asset.
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const bobMint = ethers.BigNumber.from(4).mul(DECIMALS);
      await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(bobMint.add(extraToken)));
      await stakedAuroraVaultContract.connect(bob).mint(bobMint, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(bobMint);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.be.equal(bobMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const carlDeposit = ethers.BigNumber.from(60).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(carlDeposit.add(extraToken)));
      await stakedAuroraVaultContract.connect(carl).mint(carlDeposit, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(carlDeposit);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.equal(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
    });

    it("Should not allow less than min deposit amount.", async function () {
      const {
          stakedAuroraVaultContract,
          auroraTokenContract,
          alice
      } = await loadFixture(deployPoolFixture);

      const amountToDeposit = ethers.BigNumber.from(1).mul(DECIMALS).sub(1);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, amountToDeposit);

      // First, by direct deposit.
      await expect(
        stakedAuroraVaultContract.connect(alice).deposit(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");

      // Then, by minting shares.
      await expect(
        stakedAuroraVaultContract.connect(alice).mint(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");
    });

    it("Should allow 🔥 burning of stAUR.", async function () {
      const {
        stakedAuroraVaultContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      const preAliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const preBobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const preCarlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const preAliceAssets = await stakedAuroraVaultContract.convertToAssets(preAliceShares);
      const preBobAssets = await stakedAuroraVaultContract.convertToAssets(preBobShares);
      const preTotalSupply = await stakedAuroraVaultContract.totalSupply();

      await stakedAuroraVaultContract.connect(alice).burn(preAliceShares);
      expect(preTotalSupply.sub(preAliceShares)).to.equal(await stakedAuroraVaultContract.totalSupply());
      await stakedAuroraVaultContract.connect(carl).burn(preCarlShares);
      expect(preTotalSupply.sub(preAliceShares).sub(preCarlShares)).to.equal(
        await stakedAuroraVaultContract.totalSupply()
      );
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(0);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(0);
      expect(await stakedAuroraVaultContract.convertToAssets(preBobShares)).to.be.greaterThan(
        preAliceAssets.add(preBobAssets).add(preCarlShares)
      );
    });
  });

  describe("Redeem and withdraw TOTAL Aurora tokens", function () {
    it("Should allow redeem and withdraw assets from multiple users.", async function () {
      const {
        auroraTokenContract,
        // auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      // console.log("Total assets 1: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 1: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 1: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply0 = await stakedAuroraVaultContract.totalSupply();
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      expect(aliceShares).to.be.greaterThan(0);
      const aliceLessAssets = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(alice.address)).to.equal(0);

      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(0);
      // CONSIDER: Alice assets in the withdraw-order are greater than last call
      // due to the fast (every second) price increase.
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(alice.address)
      ).to.be.greaterThanOrEqual(aliceLessAssets);

      // console.log("Total assets 2: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 2: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 2: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply1 = await stakedAuroraVaultContract.totalSupply();
      expect(supply1).to.be.lessThan(supply0);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      expect(bobShares).to.be.greaterThan(0);
      const bobLessAssets = await stakedAuroraVaultContract.previewRedeem(bobShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(bob.address)).to.equal(0);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(bob.address)
      ).to.be.greaterThanOrEqual(bobLessAssets);

      // console.log("Total assets 3: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 3: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 3: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply2 = await stakedAuroraVaultContract.totalSupply();
      expect(supply2).to.be.lessThan(supply1);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      expect(carlShares).to.be.greaterThan(0);
      const carlLessAssets = await stakedAuroraVaultContract.previewRedeem(carlShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(carl.address)).to.equal(0);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(carl.address)
      ).to.be.greaterThanOrEqual(carlLessAssets);

      // /// Original deposits.
      // const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
      // const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
      // const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
      // const aliceCurrAssets = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      // const bobCurrAssets = await stakedAuroraVaultContract.previewRedeem(bobShares);
      // const carlCurrAssets = await stakedAuroraVaultContract.previewRedeem(carlShares);
      // console.log("alice current assets: %s", aliceCurrAssets);
      // console.log("alice original depos: %s", aliceDeposit);
      // console.log("alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("bob   current assets: %s", bobCurrAssets);
      // console.log("bob   original depos: %s", bobDeposit);
      // console.log("bob   withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("carl  current assets: %s", carlCurrAssets);
      // console.log("carl  original depos: %s", carlDeposit);
      // console.log("carl  withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(carl.address));
      // console.log("Total assets 4: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 4: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 4: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));

      const supply3 = await stakedAuroraVaultContract.totalSupply();
      expect(supply3).to.be.lessThan(supply2);
      expect(await stakingManagerContract.totalWithdrawInQueue()).to.equal(
        (
          await stakingManagerContract.getWithdrawOrderAssets(alice.address)
        ).add(
          await stakingManagerContract.getWithdrawOrderAssets(bob.address)
        ).add(
          await stakingManagerContract.getWithdrawOrderAssets(carl.address)
        )
      );

      await expect(
        stakingManagerContract.cleanOrdersQueue()
      ).to.be.revertedWith("WAIT_FOR_NEXT_CLEAN_ORDER");
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      // console.log("Total assets 5: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 5: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 5: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      // console.log("Staker Manager Balance 5: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));

      // The total Supply should drop to zero, but some assets will remain due to
      // the fast stAUR repricing.
      expect(await stakedAuroraVaultContract.totalSupply()).to.equal(0);
      expect(await stakedAuroraVaultContract.totalAssets()).to.be.lessThan(AURORA);
      expect(await stakingManagerContract.totalAssets()).to.be.lessThan(AURORA);

      const alicePending = await stakingManagerContract.getPendingOrderAssets(alice.address);
      const bobPending = await stakingManagerContract.getPendingOrderAssets(bob.address);
      const carlPending = await stakingManagerContract.getPendingOrderAssets(carl.address);
      expect(alicePending).to.be.greaterThan(0);
      expect(bobPending).to.be.greaterThan(0);
      expect(carlPending).to.be.greaterThan(0);

      // Staking Manager should not have any Aurora until assets are moved from the depositors.
      expect(await auroraTokenContract.balanceOf(stakingManagerContract.address)).to.equal(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      // console.log("Aurora Staking Balance 6: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      // console.log("Staker Manager Balance 6: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);
      expect(await stakingManagerContract.getAvailableAssets(alice.address)).to.equal(alicePending);
      expect(await stakingManagerContract.getAvailableAssets(bob.address)).to.equal(bobPending);
      expect(await stakingManagerContract.getAvailableAssets(carl.address)).to.equal(carlPending);
      // console.log("Alice deposit: %s pending: %s", aliceLessAssets, alicePending);
      // console.log("Bob   deposit: %s pending: %s", bobLessAssets, bobPending);
      // console.log("Carl  deposit: %s pending: %s", carlLessAssets, carlPending);
      // console.log("Aurora required  in Manager: %s", alicePending.add(bobPending).add(carlPending));
      // console.log("Aurora available in Manager: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));

      // The available tokens in the Manager should be enough to cover the pending orders.
      expect(alicePending.add(bobPending).add(carlPending)).to.equal(
        await auroraTokenContract.balanceOf(stakingManagerContract.address)
      );

      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(alicePending, alice.address, alice.address)
      // console.log("Alice withdraw: %s", alicePending);
      // console.log("Staker Manager Balance 7: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      await stakedAuroraVaultContract.connect(bob).withdraw(bobPending, bob.address, bob.address)
      // console.log("  Bob withdraw: %s", bobPending);
      // console.log("Staker Manager Balance 8: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      await stakedAuroraVaultContract.connect(carl).withdraw(carlPending, carl.address, carl.address)
      // console.log(" Carl withdraw: %s", carlPending);
      // console.log("Staker Manager Balance 9: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(aliceBalance.add(alicePending));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(bobBalance.add(bobPending));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(carlBalance.add(carlPending));
    });

    it("Should allow Alice redeem from Depositor 01.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice
      } = await loadFixture(depositPoolFixture);

      const preAliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const preAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const preAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      await stakedAuroraVaultContract.connect(alice).redeem(preAliceShares, alice.address, alice.address);
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      const alicePendingAssets = await stakingManagerContract.getPendingOrderAssets(alice.address);
      expect(alicePendingAssets).to.be.greaterThan(0);
      const posAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      expect(preAliceDep00).to.be.lessThan(posAliceDep00);
      expect(preAliceDep01).to.be.lessThan(posAliceDep01.add(alicePendingAssets));
      expect(alicePendingAssets).to.be.greaterThan(preAliceShares);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      const aliceAurora = await auroraTokenContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(alicePendingAssets, alice.address, alice.address)
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(aliceAurora.add(alicePendingAssets));
    });

    it("Should allow Bob to deplete Dep 01 and redeem from Dep 00.", async function () {
      const {
        auroraTokenContract,
        // auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      // CONSIDER: at this point, the Depositor 01 will receive the first withdraw. But,
      // it does not have enough to pay back, so it will be depleted.
      // The rest of the funds to pay Carl will be taken from Depositor 00.
      // console.log("Depositor 00 shares: %s", await auroraStakingContract.getUserShares(depositor00Contract.address));
      // console.log("Depositor 01 shares: %s", await auroraStakingContract.getUserShares(depositor01Contract.address));
      // console.log("pre Bob shares: %s", await stakedAuroraVaultContract.balanceOf(bob.address));
      const preBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pre 00: %s", await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address));
      // console.log("pre 01: %s", preBobDep01);
      const bobShares = stakedAuroraVaultContract.balanceOf(bob.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.be.greaterThan(0);
      const posBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pos 00: %s", posBobDep00);
      // console.log("pos 01: %s", posBobDep01);

      // Depositor 01 must be depleted and Dep 00 should have enough to cover for Alice and Carl.
      expect(posBobDep01).to.equal(0);
      expect(posBobDep00).to.be.greaterThan(preBobDep01);

      // Next deposit should go to the Depositor 01.
      const carlDeposit = ethers.BigNumber.from(1_000).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

      const posCarlDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      expect(posCarlDep01).to.equal(carlDeposit);
      // console.log("pos 00: %s", await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address));
      // console.log("pos 01: %s", posCarlDep01);

      // Alice withdraw should deplete Depositor 01 again.
      const aliceShares = stakedAuroraVaultContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.be.greaterThan(0);
      const posAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pos 00: %s", posAliceDep00);
      // console.log("pos 01: %s", posAliceDep01);

      // Depositor 01 must be depleted and Dep 00 should have enough to cover for Carl.
      expect(posAliceDep01).to.equal(0);

      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      expect(carlShares).to.be.greaterThan(0);
      expect(posAliceDep00).to.be.equal(
        await stakedAuroraVaultContract.previewRedeem(carlShares)
      );

      const bobAurora = await auroraTokenContract.balanceOf(bob.address);
      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, bob.address, bob.address);
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(bobAurora.add(bobAvailableAssets));
    });

    it("Should allow redeem at different time periods. ⌚", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      const preAliceAssets = await auroraTokenContract.balanceOf(alice.address);
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const aliceRewards = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      const preBobAssets = await auroraTokenContract.balanceOf(bob.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const bobRewards = await stakedAuroraVaultContract.previewRedeem(bobShares);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // console.log("Bob withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("Bob pending  order: %s", await stakingManagerContract.getPendingOrderAssets(bob.address));
      // console.log("Bob available asse: %s", await stakingManagerContract.getAvailableAssets(bob.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending. Alice assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("Bob withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("Bob pending  order: %s", await stakingManagerContract.getPendingOrderAssets(bob.address));
      // console.log("Bob available asse: %s", await stakingManagerContract.getAvailableAssets(bob.address));
      // console.log("-----------------");

      const aliceAvailableAssets = await stakingManagerContract.getAvailableAssets(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets, alice.address, alice.address)
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(preAliceAssets.add(aliceAvailableAssets));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.be.greaterThan(preAliceAssets.add(aliceRewards));

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      const preCarlAssets = await auroraTokenContract.balanceOf(carl.address);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const carlRewards = await stakedAuroraVaultContract.previewRedeem(carlShares);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // console.log("Carl withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(carl.address));
      // console.log("Carl pending  order: %s", await stakingManagerContract.getPendingOrderAssets(carl.address));
      // console.log("Carl available asse: %s", await stakingManagerContract.getAvailableAssets(carl.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, bob.address, bob.address)
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(preBobAssets.add(bobAvailableAssets));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.be.greaterThan(preBobAssets.add(bobRewards));

      // Move forward: From withdraw to pending. Carl assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets.add(carlAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets.add(carlRewards));
    });

    it("Should allow to transfer withdraw to a different receiver. 🎁", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      const preAliceAssets = await auroraTokenContract.balanceOf(alice.address);
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const aliceRewards = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preBobAssets = await auroraTokenContract.balanceOf(bob.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const bobRewards = await stakedAuroraVaultContract.previewRedeem(bobShares);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // Move forward: From withdraw to pending. Alice assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets01 = await auroraTokenContract.balanceOf(carl.address);
      const aliceAvailableAssets = await stakingManagerContract.getAvailableAssets(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets, carl.address, alice.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets01.add(aliceAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets01.add(aliceRewards));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(preAliceAssets);

      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const carlRewards = await stakedAuroraVaultContract.previewRedeem(carlShares);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets02 = await auroraTokenContract.balanceOf(carl.address);
      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, carl.address, bob.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets02.add(bobAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets02.add(bobRewards));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(preBobAssets);

      // Move forward: From withdraw to pending. Carl assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets = await auroraTokenContract.balanceOf(carl.address);
      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets.add(carlAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets.add(carlRewards));
    });

    it("Should not allow to withdraw more than available. ", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice
      } = await loadFixture(depositPoolFixture);

      const aliceShares = stakedAuroraVaultContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // The problem here is running the withdraw before the assets are available.
      const alicePendingAssets = await stakingManagerContract.getPendingOrderAssets(alice.address);
      await expect(
        stakedAuroraVaultContract.connect(alice).withdraw(alicePendingAssets, alice.address, alice.address)
      ).to.be.revertedWith("NOT_ENOUGH_AVAILABLE_ASSETS");

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // The problem here is running the withdraw with more assets than the available.
      const aliceAvailableAssets = (await stakingManagerContract.getAvailableAssets(alice.address));
      await expect(
        stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets.add(1), alice.address, alice.address)
      ).to.be.revertedWith("NOT_ENOUGH_AVAILABLE_ASSETS");
    });
  });

  describe("Creating Withdraw Orders", function () {
    it("Should FAIL when creating more orders than max.", async function () {
      const {
        stakedAuroraVaultContract,
        alice,
        spambots
      } = await loadFixture(botsHordeFixture);

      // Bots redeem all shares from vault - filling the withdraw orders.
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        var shares = await stakedAuroraVaultContract.balanceOf(spambots[i].address);
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          shares, spambots[i].address, spambots[i].address
        );
      }

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
      ).to.be.revertedWith("TOO_MANY_WITHDRAW_ORDERS"); 

      // Burned 🔥 tokens were reverted back to Alice.
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceShares);
    });

    it("Should ALLOW increase the amount of an existing withdraw order.", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        spambots
      } = await loadFixture(botsHordeFixture);

      // Bots redeem one share from vault - filling the withdraw orders.
      const redeemBalance = ethers.BigNumber.from(1).mul(DECIMALS);
      for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
        await stakedAuroraVaultContract.connect(spambots[i]).redeem(
          redeemBalance, spambots[i].address, spambots[i].address
        );
      }

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
      ).to.be.revertedWith("TOO_MANY_WITHDRAW_ORDERS"); 

      const spamShares = await stakedAuroraVaultContract.balanceOf(spambots[0].address);
      const currentWithdrawOrder = await stakingManagerContract.getWithdrawOrderAssets(spambots[0].address);
      expect(currentWithdrawOrder).to.be.greaterThan(0);

      await stakedAuroraVaultContract.connect(spambots[0]).redeem(spamShares, spambots[0].address, spambots[0].address);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(spambots[0].address)
      ).to.be.greaterThan(currentWithdrawOrder);
    });

    it("Should FAIL when creating withdraw order with 0 shares.", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice
      } = await loadFixture(depositPoolFixture);

      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      expect(aliceShares).to.be.greaterThan(0);
      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(0);

      const zero = ethers.BigNumber.from(0);
      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(zero, alice.address, alice.address)
      ).to.be.revertedWith("CANNOT_REDEEM_ZERO_SHARES");
      expect(await stakingManagerContract.getTotalWithdrawOrders()).to.equal(0);
    });
  });

  describe("Partially redeem and withdraw Aurora tokens", function () {
    it("Should allow redeem and withdraw assets from multiple users.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        carl
      } = await loadFixture(depositPoolFixture);

      const carlShares01 = await stakedAuroraVaultContract.balanceOf(carl.address);

      const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Partial withdraw.
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares01, carl.address, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      // console.log("⚠ Available: > %s", carlAvailableAssets);
      const carlWithdraw01 = carlAvailableAssets.sub(ethers.BigNumber.from(10_000).mul(DECIMALS));
      // console.log("1st half: -->> %s", carlWithdraw01);
      // console.log("2nd half: -->> %s", ethers.BigNumber.from(10_000).mul(DECIMALS));
      // console.log("-----------------------------");
      // TOTAL WITHDRAW.
      // await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address);

      // in 2 partial WITHDRAWs.
      await stakedAuroraVaultContract.connect(carl).withdraw(carlWithdraw01, carl.address, carl.address);

      // total redeem.
      const carlRemainingShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      await stakedAuroraVaultContract.connect(carl).redeem(carlRemainingShares, carl.address, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const testAvailableAssets01 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets01).to.be.greaterThan(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // New + available assets should increase.
      const testAvailableAssets02 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets01).to.be.lessThan(testAvailableAssets02);

      await stakedAuroraVaultContract.connect(carl).withdraw(
        ethers.BigNumber.from(10_000).mul(DECIMALS), carl.address, carl.address
      );

      const testAvailableAssets03 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets03).to.be.greaterThan(0);
      expect(testAvailableAssets03).to.be.lessThan(testAvailableAssets02);

      await stakedAuroraVaultContract.connect(carl).withdraw(
        await stakingManagerContract.getAvailableAssets(carl.address), carl.address, carl.address
      );

      const testAvailableAssets04 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets04).to.equal(0);
    });
  });

  describe("Give the allowance to a 3rd party 🦅 to withdraw/redeem", function () {
    it("Alice will redeem and withdraw Carl assets.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        carl
      } = await loadFixture(depositPoolFixture);

      // FIRST EMPTY ALICE STACK.
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const aliceBalance0 = await auroraTokenContract.balanceOf(alice.address);
      const aliceAvailable = await stakingManagerContract.getAvailableAssets(alice.address);
      expect(aliceAvailable).to.be.greaterThan(0);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailable, alice.address, alice.address);
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(aliceBalance0.add(aliceAvailable));
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(0);

      // const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS); // Original deposit
      const carlAllowAlice = ethers.BigNumber.from(10_000).mul(DECIMALS);
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      // Check the allowance: IERC20 -> allowance(address owner, address spender) -> uint256
      await stakedAuroraVaultContract.connect(carl).approve(alice.address, carlAllowAlice);
      expect(
        await stakedAuroraVaultContract.connect(carl).allowance(carl.address, alice.address)
      ).to.equal(carlAllowAlice);

      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(carlAllowAlice, alice.address, alice.address)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
      await stakedAuroraVaultContract.connect(alice).redeem(carlAllowAlice, alice.address, carl.address);

      // Move forward: From redeem to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.be.greaterThan(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const aliceBalance1 = await auroraTokenContract.balanceOf(alice.address);
      const aliceAvailableAssets = await stakingManagerContract.getAvailableAssets(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets, alice.address, alice.address);
      expect(await auroraTokenContract.balanceOf(alice.address)).to.be.greaterThan(aliceBalance1);
    });
  });

  describe("Using the Liquidity Pool 🎱 to cover users deposits (FLOW 1)", function () {
    it("Deplete the Liquidity Pool, then deposit again.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        liquidityPoolContract,
        liquidity_provider,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      // StAUR deposits to the Liquidity Pool.
      const providerSwap = ethers.BigNumber.from(90_000).mul(DECIMALS); // The amount of stAUR the provider will swap back to AURORA.
      await stakedAuroraVaultContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerSwap);
      await liquidityPoolContract.connect(liquidity_provider).swapStAurForAurora(
        providerSwap,
        await liquidityPoolContract.previewSwapStAurForAurora(providerSwap)
      );

      var preTotalSupply = await stakedAuroraVaultContract.totalSupply();
      var preStAurBalance = await liquidityPoolContract.stAurBalance();
      const alicePreStAurBalance = await stakedAuroraVaultContract.balanceOf(alice.address);
      const aliceDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
      await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);
      expect(preTotalSupply).to.equal(await stakedAuroraVaultContract.totalSupply());
      expect(preStAurBalance.sub(await liquidityPoolContract.stAurBalance())).to.equal(
        (await stakedAuroraVaultContract.balanceOf(alice.address)).sub(alicePreStAurBalance)
      );

      preTotalSupply = await stakedAuroraVaultContract.totalSupply();
      preStAurBalance = await liquidityPoolContract.stAurBalance();
      const bobPreStAurBalance = await stakedAuroraVaultContract.balanceOf(bob.address);
      const bobDeposit = ethers.BigNumber.from(50_000).mul(DECIMALS);
      await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
      await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);
      expect(preTotalSupply).to.equal(await stakedAuroraVaultContract.totalSupply());
      expect(preStAurBalance.sub(await liquidityPoolContract.stAurBalance())).to.equal(
        (await stakedAuroraVaultContract.balanceOf(bob.address)).sub(bobPreStAurBalance)
      );

      preTotalSupply = await stakedAuroraVaultContract.totalSupply();
      preStAurBalance = await liquidityPoolContract.stAurBalance();
      const carlPreStAurBalance = await stakedAuroraVaultContract.balanceOf(carl.address);
      const carlDeposit = ethers.BigNumber.from(14_000).mul(DECIMALS);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);
      expect(preTotalSupply).to.equal(await stakedAuroraVaultContract.totalSupply());
      expect(preStAurBalance.sub(await liquidityPoolContract.stAurBalance())).to.equal(
        (await stakedAuroraVaultContract.balanceOf(carl.address)).sub(carlPreStAurBalance)
      );

      // StAUR in the Liquidity Pool is depleted! The vault should mint more now.
      preTotalSupply = await stakedAuroraVaultContract.totalSupply();
      preStAurBalance = await liquidityPoolContract.stAurBalance();
      const depletedPreStAurBalance = await stakedAuroraVaultContract.balanceOf(alice.address);
      const depletedDeposit = ethers.BigNumber.from(14_000).mul(DECIMALS);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, depletedDeposit);
      await stakedAuroraVaultContract.connect(alice).deposit(depletedDeposit, alice.address);
      expect(preStAurBalance).to.equal(await liquidityPoolContract.stAurBalance());
      expect(preTotalSupply.sub(await stakedAuroraVaultContract.totalSupply())).to.equal(
        depletedPreStAurBalance.sub(await stakedAuroraVaultContract.balanceOf(alice.address))
      );
    });
  });

  describe("Get the Aurora Plus 💚 rewards (Centauri Token 🪐)", function () {
    it("Should get pending and move to pending rewards.", async function () {
      const {
        depositor00Contract,
        alice,
        reward_collector
      } = await loadFixture(depositPoolFixture);

      expect(await depositor00Contract.getPendingRewards(1)).to.equal(0);
      await expect(
        depositor00Contract.connect(alice).moveRewardsToPending(1)
      ).to.be.revertedWith("AccessControl: account 0x14dc79964da2c08b23698b3d3cc7ca32193d9955 is missing role 0x131c12305311744a3f7cfa41d985c1cd8592681deca082296d27adcfcc21a0b8");
      await depositor00Contract.connect(reward_collector).moveRewardsToPending(1);
      expect(await depositor00Contract.getPendingRewards(1)).to.be.greaterThan(0);
    });

    it("Should withdraw pending rewards and give the allowance to a 3rd party.", async function () {
      const {
        depositor00Contract,
        centauriTokenContract,
        alice,
        reward_collector
      } = await loadFixture(depositPoolFixture);

      await depositor00Contract.connect(reward_collector).moveRewardsToPending(1);
      await expect(
        depositor00Contract.connect(reward_collector).withdrawRewards(1, alice.address)
      ).to.be.revertedWith("INVALID_RELEASE_TIME");

      // Move forward: From pending to available.
      await time.increaseTo(await depositor00Contract.getReleaseTime(1));

      expect(await centauriTokenContract.balanceOf(depositor00Contract.address)).to.equal(0);
      await depositor00Contract.connect(reward_collector).withdrawRewards(1, alice.address);

      const transferedRewards = await centauriTokenContract.balanceOf(depositor00Contract.address);
      expect(transferedRewards).to.be.greaterThan(0);

      expect(await centauriTokenContract.balanceOf(alice.address)).to.equal(0);
      await centauriTokenContract.connect(alice).transferFrom(depositor00Contract.address, alice.address, transferedRewards);
      expect(await centauriTokenContract.balanceOf(alice.address)).to.equal(transferedRewards);
    });
  });

  describe("Stressing the clean-orders function", function () {
    it("Should allow Bob to take funds from both depositors [PREREQUISITE FOR NEXT TEST].", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        bob
      } = await loadFixture(depositPoolFixture);

      // Bob redeem should take funds from both depositors.
      const preBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);

      const bobShares = stakedAuroraVaultContract.balanceOf(bob.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const posBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);

      expect(posBobDep01).to.equal(0);
      expect(posBobDep00).to.be.lessThan(preBobDep00);
    });

    it("Should not process ANY depositor withdraw if ONE of them fail.", async function () {
      const {
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        bob
      } = await loadFixture(depositPoolFixture);

      // Bob redeem should take funds from both depositors.
      const preBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const preBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      const directPreBobDep00 = await auroraStakingContract.getUserShares(depositor00Contract.address);
      const directPreBobDep01 = await auroraStakingContract.getUserShares(depositor01Contract.address);

      await auroraStakingContract.updateFailAtSecondWithdraw(true);

      const bobShares = stakedAuroraVaultContract.balanceOf(bob.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await expect(stakingManagerContract.cleanOrdersQueue()).to.be.reverted;

      const posBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      const directPosBobDep00 = await auroraStakingContract.getUserShares(depositor00Contract.address);
      const directPosBobDep01 = await auroraStakingContract.getUserShares(depositor01Contract.address);

      // The assets increase in price very FAST (at least during this test :( - not in reallity).
      expect(preBobDep00).to.lessThan(posBobDep00);
      expect(preBobDep01).to.lessThan(posBobDep01);
      expect(directPreBobDep00).to.equal(directPosBobDep00);
      expect(directPreBobDep01).to.equal(directPosBobDep01);
    });
  });
});