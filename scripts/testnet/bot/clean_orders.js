const hre = require("hardhat");
const { getCurrentTimestamp } = require("../../_utils");
const { STAKING_MANAGER_ADDRESS } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);

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