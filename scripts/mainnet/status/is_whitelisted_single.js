const hre = require("hardhat");
const { ACCOUNTS } = require("./_accounts");
const { getCurrentTimestamp } = require("../_utils");
const { STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  // VAULT STATUS
  await checkAddressIsWhitelisted();
}

async function checkAddressIsWhitelisted() {
    console.log("Account to check whitelisting: %s", ACCOUNTS.single);
    const { VAULT_OPERATOR_ACCOUNT } = await generateAccounts();
    const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
    const result = await StakedAuroraVaultContract
      .connect(VAULT_OPERATOR_ACCOUNT)
      .isWhitelisted(ACCOUNTS.single);
    console.log("Accounts Whitelisted? 🐻‍❄️", result)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});