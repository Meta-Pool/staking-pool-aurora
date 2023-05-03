const hre = require("hardhat");
const { getCurrentTimestamp } = require("../_utils");
const {
  AURORA_TOKEN_ADDRESS,
  DECIMALS,
  STAKED_AURORA_VAULT_ADDRESS,
  generateAccounts
} = require("../_config");

// ⚠️ UPDATE the amount to deposit.
// const vaultDeposit = ethers.BigNumber.from(300).mul(DECIMALS);
const vaultDeposit = ethers.BigNumber.from("718062481880544989308");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const Token = await ethers.getContractFactory("Token");
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);
  const AuroraTokenContract = await Token.attach(AURORA_TOKEN_ADDRESS);

  const request01 = await AuroraTokenContract
    .connect(VAULT_ADMIN_ACCOUNT)
    .approve(StakedAuroraVaultContract.address, vaultDeposit);
  console.log("Approve request: %s", request01);
  await request01.wait();

  const request02 = await StakedAuroraVaultContract
    .connect(VAULT_ADMIN_ACCOUNT)
    .deposit(vaultDeposit, VAULT_ADMIN_ACCOUNT.address);
  console.log("Deposit request: %s", request02);
  await request02.wait();

  console.log("%s AURORA tokens deposited 🔐.", vaultDeposit);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});