const hre = require("hardhat");
const { getCurrentTimestamp } = require("../../_utils");
const { LIQUIDITY_POOL_ADDRESS, STAKED_AURORA_VAULT_ADDRESS, generateAccounts } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_OPERATOR_ACCOUNT, VAULT_ADMIN_ACCOUNT, TREASURY_ACCOUNT } = await generateAccounts();
  // const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  // const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);
  // console.log("Print Available Fees: ", await LiquidityPoolContract.collectedStAurFees());

  const Token = await ethers.getContractFactory("StakedAuroraVault");
  const TokenContract = await Token.attach("0x8A7feB26ee5b202804AC11Dd5a739A945C5De11d");
  const Manager = await ethers.getContractFactory("StakingManager");
  const ManagerContract = await Manager.attach("0xfbC1423a2A4453E162cDd535991bCC4143E5d336");

  let fee = await ManagerContract.getAvailableMintFee();
  let aur = await TokenContract.convertToAssets(fee);

  
  // console.log("treasuryAccount: ", await ManagerContract.treasuryAccount());
  console.log("stAUR fee: ", ethers.utils.formatEther(fee));
  console.log("AURORA fee: ", ethers.utils.formatEther(aur));
  console.log("at price 0.2602 aurora/usd");
  console.log("USD fee :", ethers.utils.formatEther(aur.mul(2602).div(10000)));

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