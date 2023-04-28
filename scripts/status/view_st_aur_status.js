const hre = require("hardhat");

const {
  STAKING_MANAGER_ADDRESS,
  STAKED_AURORA_VAULT_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  AURORA_TOKEN_ADDRESS,
  DEPOSITORS_ADDRESS,
  AURORA_PLUS_ADDRESS,
  generateAccounts
} = require("./config");
const { getCurrentTimestamp, compareWithEmoji, getDepositorsArray } = require("../utils");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  // VAULT STATUS
  await displayVaultStatus();

  // LP STATUS

  // MANAGER STATUS
  await displayManagerStatus();

  // DEPOSITORS

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
    console.log("Depositor Share: %s stAUR", ethers.utils.formatEther(shares));
  }

  const nextDepositor = await StakingManagerContract.nextDepositor();
  console.log("Next Depositor : (%s) %s", nextDepositor, compareWithEmoji(DEPOSITORS_ADDRESS.includes(nextDepositor), true));
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

  const enforceWhitelist = await StakedAuroraVaultContract.enforceWhitelist();
  console.log("Check Whitelist: %s", enforceWhitelist);

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