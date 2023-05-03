const hre = require("hardhat");
const { getCurrentTimestamp } = require("../_utils");
const {
  AURORA_TOKEN_ADDRESS,
  DECIMALS,
  LIQUIDITY_POOL_ADDRESS,
  generateAccounts
} = require("../_config");

// ⚠️ UPDATE the amount to deposit.
const liquidityDeposit = ethers.BigNumber.from(4_900).mul(DECIMALS);

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { LIQ_POOL_ADMIN_ACCOUNT } = await generateAccounts();
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const Token = await ethers.getContractFactory("Token");
  const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);
  const AuroraTokenContract = await Token.attach(AURORA_TOKEN_ADDRESS);

  const request01 = await AuroraTokenContract
    .connect(LIQ_POOL_ADMIN_ACCOUNT)
    .approve(LiquidityPoolContract.address, liquidityDeposit);
  console.log("Approve request: %s", request01);
  await request01.wait();

  const request02 = await LiquidityPoolContract
    .connect(LIQ_POOL_ADMIN_ACCOUNT)
    .deposit(liquidityDeposit, LIQ_POOL_ADMIN_ACCOUNT.address);
  console.log("Deposit request: %s", request02);
  await request02.wait();

  console.log("%s AURORA tokens deposited 🎱.", liquidityDeposit);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});