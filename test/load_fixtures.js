const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployPoolFixture() {
  // Get the ContractFactory and Signers here.
  const AuroraToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");

  const [
    owner,
    depositors_owner,
    liquidity_pool_owner,
    operator,
    alice,
    bob,
    carl
  ] = await ethers.getSigners();

  const decimals = ethers.BigNumber.from(10).pow(18);
  const initialSupply = ethers.BigNumber.from(10_000_000).mul(decimals);
  const auroraTokenContract = await AuroraToken.deploy(
    initialSupply,
    "Aurora Token",
    "AURORA",
    alice.address
  );
  await auroraTokenContract.deployed();

  // Sharing total suply with Bob and Carl.
  const splitSupply = ethers.BigNumber.from(3_000_000).mul(decimals);
  await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
  await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);

  const auroraStakingContract = await AuroraStaking.deploy(
    auroraTokenContract.address
  );
  await auroraStakingContract.deployed();

  // Send Tokens to the Aurora Staking contract to pay for rewards.
  const forRewards = ethers.BigNumber.from(1_000_000).mul(decimals);
  await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);

  const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
  const stakedAuroraVaultContract = await StakedAuroraVault.deploy(
    auroraTokenContract.address,
    "Staked Aurora Token",
    "stAUR",
    minDepositAmount
  );
  await stakedAuroraVaultContract.deployed();

  const stakingManagerContract = await StakingManager.deploy(
    stakedAuroraVaultContract.address,
    auroraStakingContract.address,
    depositors_owner.address,
    10  // Max withdraw orders
  );
  await stakingManagerContract.deployed();

  // Initialize/update the staking manager in the ERC-4626
  await expect(
    stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address)
  ).to.be.revertedWith("NOT_INITIALIZED");
  await stakedAuroraVaultContract.initializeStakingManager(stakingManagerContract.address);
  await expect(
    stakedAuroraVaultContract.initializeStakingManager(stakingManagerContract.address)
  ).to.be.revertedWith("ALREADY_INITIALIZED");

  const depositor00Contract = await Depositor.connect(depositors_owner).deploy(
    stakingManagerContract.address
  );
  await depositor00Contract.deployed();

  const depositor01Contract = await Depositor.connect(depositors_owner).deploy(
    stakingManagerContract.address
  );
  await depositor01Contract.deployed();

  await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor00Contract.address);
  await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor01Contract.address);

  // Deploy Liquidity Pool
  const liquidityPoolContract = await LiquidityPool.deploy(
    stakingManagerContract.address,
    auroraTokenContract.address,
    "stAUR/AURORA LP Token",
    "stAUR/AUR",
    minDepositAmount
  );
  await liquidityPoolContract.deployed();

  // Initialize/update the liquidity pool in the ERC-4626
  await expect(
    stakedAuroraVaultContract.updateLiquidityPool(liquidityPoolContract.address)
  ).to.be.revertedWith("NOT_INITIALIZED");
  await stakedAuroraVaultContract.initializeLiquidityPool(liquidityPoolContract.address);
  await expect(
    stakedAuroraVaultContract.initializeLiquidityPool(liquidityPoolContract.address)
  ).to.be.revertedWith("ALREADY_INITIALIZED");

  // Staking Aurora Vault should be fully operational by now.
  expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;

  // Fixtures can return anything you consider useful for your tests
  return {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    operator,
    alice,
    bob,
    carl,
    decimals
  };
}

async function depositPoolFixture() {
  const {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    operator,
    alice,
    bob,
    carl,
    decimals
  } = await loadFixture(deployPoolFixture);

  // Test deposit with a not fully operational contract.
  const aliceDeposit = ethers.BigNumber.from(6_000).mul(decimals);
  await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
  await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
  await expect(
    stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
  ).to.be.revertedWith("CONTRACT_IS_NOT_FULLY_OPERATIONAL");
  await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
  await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

  const bobDeposit = ethers.BigNumber.from(100_000).mul(decimals);
  await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
  await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

  const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
  await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
  await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

  await stakingManagerContract.cleanOrdersQueue();

  return {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    operator,
    alice,
    bob,
    carl,
    decimals
  };
}

module.exports = {
  deployPoolFixture,
  depositPoolFixture
};

  