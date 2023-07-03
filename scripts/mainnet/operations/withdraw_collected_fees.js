const hre = require("hardhat");
const { getCurrentTimestamp } = require("../../_utils");
const { LIQUIDITY_POOL_ADDRESS, STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_OPERATOR_ACCOUNT, VAULT_ADMIN_ACCOUNT, TREASURY_ACCOUNT } = await generateAccounts();
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);
  console.log("Print Available Fees: ", await LiquidityPoolContract.collectedStAurFees());

  // console.log("Current Vault Whitelist status: %s", await StakedAuroraVaultContract.enforceWhitelist());
  // const request = await StakedAuroraVaultContract
  //   // CONSIDER: This is only for legacy
  //   // .connect(VAULT_OPERATOR_ACCOUNT)
  //   .connect(VAULT_ADMIN_ACCOUNT)
  //   .toggleEnforceWhitelist()
  //   // .updateEnforceWhitelist(true);
  // console.log("Request: %s", request);
  // await request.wait();
  // console.log("Vault Whitelist status NOW: %s", await StakedAuroraVaultContract.enforceWhitelist());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});