const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, impersonateAccount, time } = require("@nomicfoundation/hardhat-network-helpers");

const {
  ADMIN_ADDRESS,
  AURORA_PLUS_ADDRESS,
  AURORA_TOKEN_ADDRESS,
  AURORA_WHALE_ADDRESS,
  DEPOSITOR_00_ADDRESS,
  DEPOSITOR_01_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  OPERATOR_ADDRESS,
  STAKED_AURORA_VAULT_ADDRESS,
  STAKING_MANAGER_ADDRESS,
  TOTAL_SPAMBOTS,
  MAX_WITHDRAW_ORDERS
} = require("./_config");

const DECIMALS = ethers.BigNumber.from(10).pow(18);
const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

// CONTRACT ROLES
const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ADMIN_ROLE'));
const DEPOSITORS_OWNER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('DEPOSITORS_OWNER_ROLE'));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('OPERATOR_ROLE'));
const COLLECT_REWARDS_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('COLLECT_REWARDS_ROLE'));
const TREASURY_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TREASURY_ROLE'));

async function useProdForkFixture() {
  // Get the ContractFactory and Signers here.
  const AuroraToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");

  const AuroraTokenContract = await AuroraToken.attach(AURORA_TOKEN_ADDRESS);
  const AuroraStakingContract = await AuroraStaking.attach(AURORA_PLUS_ADDRESS);
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);
  const Depositor00Contract = await Depositor.attach(DEPOSITOR_00_ADDRESS);
  const Depositor01Contract = await Depositor.attach(DEPOSITOR_01_ADDRESS);
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
  const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);

  const [
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl
  ] = await ethers.getSigners();

  const impersonatedAdmin = await ethers.getImpersonatedSigner(ADMIN_ADDRESS);
  const impersonatedOperator = await ethers.getImpersonatedSigner(OPERATOR_ADDRESS);
  
  const impersonatedWhale = await ethers.getImpersonatedSigner(AURORA_WHALE_ADDRESS);

//   tx = {
//       to: alice.address,
//       value: ethers.utils.parseEther('0.02', 'ether')
//   };
//   impersonatedAdmin

// const transaction = await signer.sendTransaction(tx);

  await AuroraTokenContract
    .connect(impersonatedWhale)
    .transfer(
      ADMIN_ADDRESS,
      await AuroraTokenContract.balanceOf(AURORA_WHALE_ADDRESS)
    );
  


  return {
    AuroraTokenContract,
    AuroraStakingContract,
    StakingManagerContract,
    Depositor00Contract,
    Depositor01Contract,
    StakedAuroraVaultContract,
    LiquidityPoolContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl,
    impersonatedAdmin,
    impersonatedOperator,
  };
}

async function deployPoolFixture() {
  // Get the ContractFactory and Signers here.
  const AuroraToken = await ethers.getContractFactory("Token");
  const CentauriToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const Router = await ethers.getContractFactory("ERC4626Router");

  const [
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
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

  // Centauri Token will be use as Aurora Staking "Reward".
  const centauriInitialSupply = ethers.BigNumber.from(200).mul(DECIMALS);
  const centauriTokenContract = await CentauriToken.deploy(
    centauriInitialSupply,
    "Centauri Token",
    "CENTAURI",
    alice.address
  );
  await centauriTokenContract.deployed();

  // Sharing total supply with Bob and Carl.
  const splitSupply = ethers.BigNumber.from(3_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
  await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);

  // Sharing Aurora Tokens with the Liquidity Provider.
  const liquiditySupply = ethers.BigNumber.from(10_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(liquidity_provider.address, liquiditySupply);

  const auroraStakingContract = await AuroraStaking.deploy(
    auroraTokenContract.address,
    centauriTokenContract.address
  );
  await auroraStakingContract.deployed();

  // Send Tokens to the Aurora Staking contract to pay for rewards.
  const forRewards = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);

  // Send all Centauri Tokens to the Aurora Staking contract.
  await centauriTokenContract.connect(alice).transfer(auroraStakingContract.address, centauriInitialSupply);

  const minDepositAmount = ethers.BigNumber.from(1).mul(DECIMALS);
  const stakedAuroraVaultContract = await StakedAuroraVault.connect(owner).deploy(
    500,            // Basis points
    60 * 60 * 24,   // Cooling period
    minDepositAmount,
    operator.address,
    treasury.address,
    AURORA_TOKEN_ADDRESS,
    "Staked Aurora Token",
    "stAUR"
  );
  await stakedAuroraVaultContract.deployed();

  const stakingManagerContract = await StakingManager.connect(owner).deploy(
    stakedAuroraVaultContract.address,
    auroraStakingContract.address,
    operator.address,
    MAX_WITHDRAW_ORDERS
  );
  await stakingManagerContract.deployed();

  const depositor00Contract = await Depositor.connect(depositors_owner).deploy(
    stakingManagerContract.address,
    reward_collector.address
  );
  await depositor00Contract.deployed();

  const depositor01Contract = await Depositor.connect(depositors_owner).deploy(
    stakingManagerContract.address,
    reward_collector.address
  );
  await depositor01Contract.deployed();

  await stakingManagerContract.connect(owner).insertDepositor(depositor00Contract.address);
  await stakingManagerContract.connect(owner).insertDepositor(depositor01Contract.address);

  // Deploy Liquidity Pool
  const liquidityPoolContract = await LiquidityPool.connect(liquidity_pool_owner).deploy(
    stakedAuroraVaultContract.address,
    auroraTokenContract.address,
    treasury.address,
    operator.address,
    "stAUR/AURORA LP Token",
    "stAUR/AUR",
    minDepositAmount,
    200,    // Swap fee basis points
    8000    // Liquidity Providers fee cut basis points
  );
  await liquidityPoolContract.deployed();

  // Initialize the Liquid Staking service.
  await expect(
    stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address)
  ).to.be.revertedWithCustomError(stakedAuroraVaultContract, "ContractNotInitialized");
  await expect(
    stakedAuroraVaultContract.updateLiquidityPool(liquidityPoolContract.address)
  ).to.be.revertedWithCustomError(stakedAuroraVaultContract, "ContractNotInitialized");
  await stakedAuroraVaultContract.initializeLiquidStaking(
    stakingManagerContract.address,
    liquidityPoolContract.address
  );
  await expect(
    stakedAuroraVaultContract.initializeLiquidStaking(
      stakingManagerContract.address,
      liquidityPoolContract.address
    )
  ).to.be.revertedWithCustomError(stakedAuroraVaultContract, "ContractAlreadyInitialized");

  // Staking Aurora Vault should be fully operational by now.
  expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;

  // Deploying router for stAurVault and LiquidityPool.
  const RouterContract = await Router.deploy();
  await RouterContract.deployed();

  // v0.2 is no longer whitelisted.
  // // Whitelisting all the accounts.
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(alice.address);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(bob.address);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(carl.address);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(liquidity_provider.address);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(RouterContract.address);

  // Fixtures can return anything you consider useful for your tests
  return {
    auroraTokenContract,
    centauriTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    RouterContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl
  };
}

async function depositPoolFixture() {
  const {
    auroraTokenContract,
    centauriTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    RouterContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl
  } = await loadFixture(deployPoolFixture);

  // v0.2 is no longer whitelisted.
  // Blacklist some of the accounts for testing purposes.
  // await stakedAuroraVaultContract.connect(operator).blacklistAccount(alice.address);
  // await stakedAuroraVaultContract.connect(operator).blacklistAccount(bob.address);
  // await stakedAuroraVaultContract.connect(operator).blacklistAccount(carl.address);

  // Test deposit with a not fully operational contract.
  const aliceDeposit = ethers.BigNumber.from(6_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
  await stakedAuroraVaultContract.connect(owner).updateContractOperation(false);
  await expect(
    stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
  ).to.be.revertedWithCustomError(stakedAuroraVaultContract, "NotFullyOperational");
  await stakedAuroraVaultContract.connect(owner).updateContractOperation(true);

  // v0.2 is no longer whitelisted.
  // await expect(
  //   stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address)
  // ).to.be.revertedWithCustomError(stakedAuroraVaultContract, "AccountNotWhitelisted");

  // v0.2 is no longer whitelisted.
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(alice.address);
  await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

  // v0.2 is no longer whitelisted.
  // await stakedAuroraVaultContract.connect(operator).updateEnforceWhitelist(false);

  const bobDeposit = ethers.BigNumber.from(100_000).mul(DECIMALS);
  await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
  await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

  // v0.2 is no longer whitelisted.
  // await stakedAuroraVaultContract.connect(operator).updateEnforceWhitelist(true);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(bob.address);
  // await stakedAuroraVaultContract.connect(operator).whitelistAccount(carl.address);

  const carlDeposit = ethers.BigNumber.from(24_000).mul(DECIMALS);
  await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
  await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

  await stakingManagerContract.cleanOrdersQueue();

  return {
    auroraTokenContract,
    centauriTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    RouterContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl
  };
}

async function liquidityPoolFixture() {
  const {
    auroraTokenContract,
    centauriTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    RouterContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
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
    centauriTokenContract,
    auroraStakingContract,
    stakedAuroraVaultContract,
    stakingManagerContract,
    depositor00Contract,
    depositor01Contract,
    liquidityPoolContract,
    RouterContract,
    owner,
    depositors_owner,
    liquidity_pool_owner,
    liquidity_provider,
    operator,
    treasury,
    reward_collector,
    alice,
    bob,
    carl
  };
}

async function botsHordeFixture() {
  const {
    auroraTokenContract,
    centauriTokenContract,
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
    treasury,
    reward_collector,
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

  // v0.2 is no longer whitelisted.
  // await stakedAuroraVaultContract.connect(operator).updateEnforceWhitelist(false);

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

  // ALL bots will already have a withdraw order.
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

  return {
    auroraTokenContract,
    centauriTokenContract,
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
    treasury,
    reward_collector,
    alice,
    bob,
    carl,
    spambots
  };
}

module.exports = {
  botsHordeFixture,
  deployPoolFixture,
  depositPoolFixture,
  liquidityPoolFixture,
  useProdForkFixture,
  AURORA,
  DECIMALS,
  TOTAL_SPAMBOTS,
  MAX_WITHDRAW_ORDERS,
  ADMIN_ROLE,
  DEPOSITORS_OWNER_ROLE,
  OPERATOR_ROLE,
  COLLECT_REWARDS_ROLE,
  TREASURY_ROLE
};