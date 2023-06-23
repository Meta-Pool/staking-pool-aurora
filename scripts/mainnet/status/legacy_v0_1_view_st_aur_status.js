const hre = require("hardhat");

// AURORA Mainnet addresses 🚨 Legacy v0.1 🚨
const AURORA_PLUS_ADDRESS = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
const AURORA_TOKEN_ADDRESS = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
const DEPOSITOR_00_ADDRESS = "0xf56Baf1EE71fD4d6938c88E1C4bd0422ee768932";
const DEPOSITOR_01_ADDRESS = "0x7ca831De9E59D7414313a1F7a003cc7d011caFE2";
const LIQUIDITY_POOL_ADDRESS = "0x2b22F6ae30DD752B5765dB5f2fE8eF5c5d2F154B";
const STAKED_AURORA_VAULT_ADDRESS = "0xb01d35D469703c6dc5B369A1fDfD7D6009cA397F";
const STAKING_MANAGER_ADDRESS = "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8";

const DEPOSITORS_ADDRESS = [ DEPOSITOR_00_ADDRESS, DEPOSITOR_01_ADDRESS ];

const { getCurrentTimestamp, compareWithEmoji, getDepositorsArray } = require("../../_utils");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  // VAULT STATUS
  await displayVaultStatus();

  // LP STATUS
  await displayLPStatus();

  // MANAGER STATUS
  await displayManagerStatus();

  // DEPOSITORS

}

async function displayLPStatus() {
  console.log("\nPool 🎱 (%s):", LIQUIDITY_POOL_ADDRESS);
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);

  const stAurVault = await LiquidityPoolContract.stAurVault();
  console.log("Staked Vault   : (%s) %s", stAurVault, compareWithEmoji(stAurVault, STAKED_AURORA_VAULT_ADDRESS));

  const auroraToken = await LiquidityPoolContract.auroraToken();
  console.log("Aurora Token   : (%s) %s", auroraToken, compareWithEmoji(auroraToken, AURORA_TOKEN_ADDRESS));

  const fullyOperational = await LiquidityPoolContract.fullyOperational();
  console.log("Fully Operatnal: %s", fullyOperational);

  const stAurBalance = await LiquidityPoolContract.stAurBalance();
  console.log("stAUR Balance  : %s stAUR", ethers.utils.formatEther(stAurBalance));

  const auroraBalance = await LiquidityPoolContract.auroraBalance();
  console.log("AURORA Balance : %s AURORA", ethers.utils.formatEther(auroraBalance));

  const totalSupply = await LiquidityPoolContract.totalSupply();
  console.log("Total Supply   : %s stAUR/AUR", ethers.utils.formatEther(totalSupply));

  const minDepositAmount = await LiquidityPoolContract.minDepositAmount();
  console.log("minDepos Amount: %s AURORA", ethers.utils.formatEther(minDepositAmount));

  const swapFeeBasisPoints = await LiquidityPoolContract.swapFeeBasisPoints();
  console.log("Swap fee BasisP: %s Basis Points", swapFeeBasisPoints);

  const liqProvFeeCutBasisPoints = await LiquidityPoolContract.liqProvFeeCutBasisPoints();
  console.log("LP fee cut BasP: %s Basis Points", liqProvFeeCutBasisPoints);

  const collectedStAurFees = await LiquidityPoolContract.collectedStAurFees();
  console.log("Collected Fees : %s stAUR", ethers.utils.formatEther(collectedStAurFees));
}

async function displayManagerStatus() {
  console.log("\nManager 🧑‍💼 (%s):", STAKING_MANAGER_ADDRESS);
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);

  const stAurVault = await StakingManagerContract.stAurVault();
  console.log("Staked Vault   : (%s) %s", stAurVault, compareWithEmoji(stAurVault, STAKED_AURORA_VAULT_ADDRESS));

  const auroraToken = await StakingManagerContract.auroraToken();
  console.log("Aurora Token   : (%s) %s", auroraToken, compareWithEmoji(auroraToken, AURORA_TOKEN_ADDRESS));

  const auroraStaking = await StakingManagerContract.auroraStaking();
  console.log("Aurora Plus    : (%s) %s", auroraStaking, compareWithEmoji(auroraStaking, AURORA_PLUS_ADDRESS));

  const depositorsLength = await StakingManagerContract.getDepositorsLength();
  console.log("Depositors Len : %s %s", depositorsLength, compareWithEmoji(depositorsLength, DEPOSITORS_ADDRESS.length));

  const depositors = await getDepositorsArray(StakingManagerContract);
  for (let i = 0; i < depositors.length; i++) {
    console.log("Depositor  0%s  : (%s) %s", i, depositors[i], compareWithEmoji(depositors[i], DEPOSITORS_ADDRESS[i]));
    const shares = await StakingManagerContract.getDepositorShares(depositors[i]);
    console.log("Depositor Share: %s AURORA Plus Shares", ethers.utils.formatEther(shares));
  }

  const nextDepositor = await StakingManagerContract.nextDepositor();
  console.log("Next Depositor : (%s) %s", nextDepositor, compareWithEmoji(DEPOSITORS_ADDRESS.includes(nextDepositor), true));

  // View the next time for run.
  const nextCleanTimestamp = await StakingManagerContract.nextCleanOrderQueue();

  var _now = new Date(getCurrentTimestamp() * 1000);
  _now = _now.toGMTString();

  var _next = new Date(nextCleanTimestamp * 1000);
  _next = _next.toGMTString();

  console.log("Now            : %s", _now);
  console.log("Next time clean: %s", _next);
  console.log("MrRobot 🤖 run?: %s", compareWithEmoji(nextCleanTimestamp < getCurrentTimestamp(), true));
  console.log("Withdraw Orders: %s", await StakingManagerContract.getTotalWithdrawOrders());
  console.log("Pending  Orders: %s", await StakingManagerContract.getTotalPendingOrders());
}

async function displayVaultStatus() {
  console.log("\nVault 🔐 (%s):", STAKED_AURORA_VAULT_ADDRESS);
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);

  const stakingManager = await StakedAuroraVaultContract.stakingManager();
  console.log("Staking Manager: (%s) %s", stakingManager, compareWithEmoji(stakingManager, STAKING_MANAGER_ADDRESS));

  const liquidityPool = await StakedAuroraVaultContract.liquidityPool();
  console.log("Liquidity Pool : (%s) %s", liquidityPool, compareWithEmoji(liquidityPool, LIQUIDITY_POOL_ADDRESS));

  const fullyOperational = await StakedAuroraVaultContract.fullyOperational();
  console.log("Fully Operatnal: %s", fullyOperational);

  // const enforceWhitelist = await StakedAuroraVaultContract.enforceWhitelist();
  // console.log("Check Whitelist: %s", enforceWhitelist);

  const minDepositAmount = await StakedAuroraVaultContract.minDepositAmount();
  console.log("minDepos Amount: %s AURORA", ethers.utils.formatEther(minDepositAmount));

  const totalAssets = await StakedAuroraVaultContract.totalAssets();
  console.log("total Assets   : %s AURORA", ethers.utils.formatEther(totalAssets));

  const totalShares = await StakedAuroraVaultContract.totalSupply();
  console.log("total Shares   : %s stAUR", ethers.utils.formatEther(totalShares));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});