const hre = require("hardhat");
const { getCurrentTimestamp, getDepositorsArray } = require("../../_utils");
const { STAKING_MANAGER_ADDRESS, generateAccounts, AURORA_PLUS_ADDRESS } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);
  const AuroraStakingContract = await StakingManager.attach(AURORA_PLUS_ADDRESS);

  const { DEPOSITOR_FEE_COLLECTOR_ACCOUNT } = generateAccounts();

  // View the next time for run.
  const nextCleanTimestamp = await StakingManagerContract.nextCleanOrderQueue();

  console.log("Next time to clean the orders queue: %s", nextCleanTimestamp);
  console.log("Should Mr Robot run again: %s", nextCleanTimestamp < getCurrentTimestamp());

  if (nextCleanTimestamp < getCurrentTimestamp()) {
    const request = await StakingManagerContract.cleanOrdersQueue();
    console.log("Robot request: %s", request);
    await request.wait();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});