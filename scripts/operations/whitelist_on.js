const hre = require("hardhat");
const { getCurrentTimestamp } = require("../utils");
const { STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("./config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_OPERATOR_ACCOUNT, VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
  console.log("Current Vault Whitelist status: %s", await StakedAuroraVaultContract.enforceWhitelist());
  const request = await StakedAuroraVaultContract
    // CONSIDER: This is only for legacy
    // .connect(VAULT_OPERATOR_ACCOUNT)
    .connect(VAULT_ADMIN_ACCOUNT)
    .toggleEnforceWhitelist()
    // .updateEnforceWhitelist(true);
  console.log("Request: %s", request);
  await request.wait();
  console.log("Vault Whitelist status NOW: %s", await StakedAuroraVaultContract.enforceWhitelist());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});