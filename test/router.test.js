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
});