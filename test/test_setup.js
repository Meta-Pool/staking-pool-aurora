const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const DECIMALS = ethers.BigNumber.from(10).pow(18);
const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

const EQUAL_SPAMBOTS_WITHDRAW_ORDERS = 20;
const TOTAL_SPAMBOTS = EQUAL_SPAMBOTS_WITHDRAW_ORDERS;
const MAX_WITHDRAW_ORDERS = EQUAL_SPAMBOTS_WITHDRAW_ORDERS;
const MAX_DEPOSITORS = 3;

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
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
  ] = await ethers.getSigners();

  const initialSupply = ethers.BigNumber.from(20_000_000).mul(DECIMALS);
  const auroraTokenContract = await AuroraToken.deploy(
    initialSupply,
    "Aurora Token",
    "AURORA",
    alice.address
  );
  await auroraTokenContract.deployed();

  // Sharing total suply with Bob and Carl.
  const splitSupply = ethers.BigNumber.from(3_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
  await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);

  // Sharing Aurora Tokens with the Liquidity Provider.
  const liquiditySupply = ethers.BigNumber.from(10_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(liquidity_provider.address, liquiditySupply);

  const auroraStakingContract = await AuroraStaking.deploy(
    auroraTokenContract.address
  );
  await auroraStakingContract.deployed();

  // Send Tokens to the Aurora Staking contract to pay for rewards.
  const forRewards = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);

  const minDepositAmount = ethers.BigNumber.from(1).mul(DECIMALS);
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
    operator.address,
    MAX_WITHDRAW_ORDERS,
    MAX_DEPOSITORS
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
  const liquidityPoolContract = await LiquidityPool.connect(liquidity_pool_owner).deploy(
    stakedAuroraVaultContract.address,
    auroraTokenContract.address,
    "stAUR/AURORA LP Token",
    "stAUR/AUR",
    minDepositAmount,
    200 // Swap fee basis points
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

  // Whitelisting all the accounts.
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(alice.address);
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(bob.address);
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(carl.address);
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(liquidity_provider.address);

  // Fixtures can return anything you consider useful for your tests
  return {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
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
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
  } = await loadFixture(deployPoolFixture);

  // Blacklist some of the accounts for testing purposes.
  await stakedAuroraVaultContract.connect(owner).blacklistAccount(alice.address);
  await stakedAuroraVaultContract.connect(owner).blacklistAccount(bob.address);
  await stakedAuroraVaultContract.connect(owner).blacklistAccount(carl.address);

  // Test deposit with a not fully operational contract.
  const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
  await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();
  await expect(
    stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
  ).to.be.revertedWith("CONTRACT_IS_NOT_FULLY_OPERATIONAL");
  await stakedAuroraVaultContract.connect(owner).toggleFullyOperational();

  await expect(
    stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
  ).to.be.revertedWith("ACCOUNT_IS_NOT_WHITELISTED");

  await stakedAuroraVaultContract.connect(owner).whitelistAccount(alice.address);
  await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

  await stakedAuroraVaultContract.connect(owner).toggleEnforceWhitelist();

  const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
  await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
  await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

  await stakedAuroraVaultContract.connect(owner).toggleEnforceWhitelist();
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(bob.address);
  await stakedAuroraVaultContract.connect(owner).whitelistAccount(carl.address);

  const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
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
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
  };
}

async function liquidityPoolFixture() {
  const {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
  } = await loadFixture(deployPoolFixture);

  // AURORA deposits to the Vault.
  const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
  await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

  const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
  await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
  await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

  const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
  await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
  await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

  const providerDeposit = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(liquidity_provider).approve(stakedAuroraVaultContract.address, providerDeposit);
  await stakedAuroraVaultContract.connect(liquidity_provider).deposit(providerDeposit, liquidity_provider.address);

  await stakingManagerContract.cleanOrdersQueue();

  // AURORA deposits to the Liquidity Pool.
  await auroraTokenContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerDeposit);
  await liquidityPoolContract.connect(liquidity_provider).deposit(providerDeposit, liquidity_provider.address);

  return {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl
  };
}

async function botsHordeFixture() {
  const {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract
  } = await loadFixture(deployPoolFixture);

  const [
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl,
    spam_master,
  ] = await ethers.getSigners();

  var spambots = new Array();
  for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
    // Get a new wallet
    wallet = ethers.Wallet.createRandom();
    // add the provider from Hardhat
    wallet =  wallet.connect(ethers.provider);
    // send ETH to the new wallet so it can perform a tx
    await spam_master.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("1")});
    spambots.push(wallet);
  }

  await stakedAuroraVaultContract.connect(owner).toggleEnforceWhitelist();

  // AURORA deposits to the Vault.
  const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
  await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

  const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
  await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
  await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

  const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
  await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
  await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

  const providerDeposit = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(liquidity_provider).approve(stakedAuroraVaultContract.address, providerDeposit);
  await stakedAuroraVaultContract.connect(liquidity_provider).deposit(providerDeposit, liquidity_provider.address);

  // Bots horde. ⚒️
  const botBalance = ethers.BigNumber.from(30).mul(DECIMALS);
  const botDeposit = ethers.BigNumber.from(10).mul(DECIMALS);
  for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
    await auroraTokenContract.connect(alice).transfer(spambots[i].address, botBalance);
    await auroraTokenContract.connect(spambots[i]).approve(stakedAuroraVaultContract.address, botDeposit);
    await stakedAuroraVaultContract.connect(spambots[i]).deposit(botDeposit, spambots[i].address);
  }

  await stakingManagerContract.cleanOrdersQueue();

  // AURORA deposits to the Liquidity Pool.
  await auroraTokenContract.connect(liquidity_provider).approve(liquidityPoolContract.address, providerDeposit);
  await liquidityPoolContract.connect(liquidity_provider).deposit(providerDeposit, liquidity_provider.address);

  return {
    auroraTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    alice,
    bob,
    carl,
    spambots
  };
}

module.exports = {
  deployPoolFixture,
  depositPoolFixture,
  liquidityPoolFixture,
  botsHordeFixture,
  AURORA,
  DECIMALS,
  TOTAL_SPAMBOTS,
  MAX_WITHDRAW_ORDERS,
  MAX_DEPOSITORS
};