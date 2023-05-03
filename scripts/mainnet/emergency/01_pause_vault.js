const hre = require("hardhat");
const { getCurrentTimestamp } = require("../utils");
const { STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("./config");

console.log("Mr Robot 🤖 - EMERGENCY MODE 🔥 - Step 01");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);

  const request = await StakedAuroraVaultContract.connect(VAULT_ADMIN_ACCOUNT).updateContractOperation(false);
  console.log("REQUEST: %s\n", request);
  const receipt = await request.wait();
  console.log("RECEIPT: %s\n", receipt);

  console.log("From the Vault contract (%s):", STAKED_AURORA_VAULT_ADDRESS);
  console.log("Is contract fully operational: %s", await StakedAuroraVaultContract.fullyOperational());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});