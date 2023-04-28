const hre = require("hardhat");
const { getCurrentTimestamp } = require("../utils");
const { ACCOUNT_BULK_OPERATIONS_INPUT, STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("./config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  console.log("Accounts to Whitelist: %s", ACCOUNT_BULK_OPERATIONS_INPUT);
  const { VAULT_OPERATOR_ACCOUNT, VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
  const request = await StakedAuroraVaultContract
    // .connect(VAULT_OPERATOR_ACCOUNT)
    .connect(VAULT_ADMIN_ACCOUNT)
    .whitelistAccount(ACCOUNT_BULK_OPERATIONS_INPUT[1]);
    // .bulkWhitelistAccount();
  console.log("Request: %s", request);
  await request.wait();
  console.log("Accounts Whitelisted 🐻‍❄️.")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});