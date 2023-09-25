const hre = require("hardhat");

const {
  STAKING_MANAGER_ADDRESS,
  STAKED_AURORA_VAULT_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  AURORA_TOKEN_ADDRESS,
  DEPOSITORS_ADDRESS,
  AURORA_PLUS_ADDRESS
} = require("../_config");
const { getCurrentTimestamp, compareWithEmoji, getDepositorsArray } = require("../../_utils");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
  console.log(await StakedAuroraVaultContract.balanceOf("0xa11480532C9eddB19C70285BD22588118CEF6d80"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});