const hre = require("hardhat");

// AURORA Mainnet addresses 🚨 Legacy v0.1 🚨
const AURORA_PLUS_ADDRESS = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
const AURORA_TOKEN_ADDRESS = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
const DEPOSITOR_00_ADDRESS = "0xf56Baf1EE71fD4d6938c88E1C4bd0422ee768932";
const DEPOSITOR_01_ADDRESS = "0x7ca831De9E59D7414313a1F7a003cc7d011caFE2";
const LIQUIDITY_POOL_ADDRESS = "0x2b22F6ae30DD752B5765dB5f2fE8eF5c5d2F154B";
const STAKED_AURORA_VAULT_ADDRESS = "0xb01d35D469703c6dc5B369A1fDfD7D6009cA397F";
const STAKING_MANAGER_ADDRESS = "0x69e3a362ffD379cB56755B142c2290AFbE5A6Cc8";

const DEPOSITORS_ADDRESS = [ DEPOSITOR_00_ADDRESS, DEPOSITOR_01_ADDRESS ];

const { getCurrentTimestamp } = require("../../_utils");
const { generateAccounts } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { TREASURY_ACCOUNT, VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const LiquidityPoolContract = await LiquidityPool.attach(LIQUIDITY_POOL_ADDRESS);
  console.log("Print Available Fees: ", await LiquidityPoolContract.collectedStAurFees());
  const request = await LiquidityPoolContract
    .connect(TREASURY_ACCOUNT)
    .withdrawCollectedStAurFees(VAULT_ADMIN_ACCOUNT.address);

  console.log("Request: %s", request);
  await request.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});