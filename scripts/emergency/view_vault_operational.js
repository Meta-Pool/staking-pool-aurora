const hre = require("hardhat");

const { STAKED_AURORA_VAULT } = require("./config");
const { getCurrentTimestamp } = require("../utils");

console.log("Mr Robot 🤖 - EMERGENCY MODE 🔥 - Step 01");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT);

  console.log("From the Vault contract (%s):", STAKED_AURORA_VAULT);
  console.log("Is contract fully operational: %s", await StakedAuroraVaultContract.fullyOperational());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});