require("dotenv").config()
const hre = require("hardhat");
const { getCurrentTimestamp, getDepositorsArray } = require("../../_utils");
const { STAKING_MANAGER_ADDRESS, AURORA_PLUS_ADDRESS } = require("../_config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);
  const AuroraStakingContract = await AuroraStaking.attach(AURORA_PLUS_ADDRESS);


  // View the next time for run.
  const nextCleanTimestamp = await StakingManagerContract.nextCleanOrderQueue();

  console.log("Next time to clean the orders queue: %s", nextCleanTimestamp);
  console.log("Should Mr Robot run again: %s", nextCleanTimestamp < getCurrentTimestamp());

  if (nextCleanTimestamp < getCurrentTimestamp()) {
    const request = await StakingManagerContract.cleanOrdersQueue();
    console.log("Robot request: %s", request);
    await request.wait();
  }

  // const DEPOSITOR_FEE_COLLECTOR_ACCOUNT
  const DEPOSITOR_FEE_COLLECTOR_ACCOUNT = new ethers.Wallet(
    process.env.DEPOSITOR_FEE_COLLECTOR_PRIVATE_KEY,
    hre.ethers.provider
  );

  const depositors = await getDepositorsArray(StakingManagerContract);
  console.log("DEPOSITORS: ", depositors);
  for (let i = 0; i < depositors.length; ++i) {
    console.log("Depositor -%s-", i);
    let DepositorContract = Depositor.attach(depositors[i]);
    let streamCount = await AuroraStakingContract.getStreamsCount() - 1;
    console.log("PRE", streamCount);
    for (let j = 1; j <= streamCount; ++j) {
      // Move rewards to pending.
      console.log("Reward Token Stream: ", (await AuroraStakingContract.getStream(j))[1]);
      console.log(
        "Pending Rewards for Stream %s: %s",
        j,
        await AuroraStakingContract.getPending(j, DepositorContract.address)
      );
      let claimable = await AuroraStakingContract.getStreamClaimableAmount(j, DepositorContract.address);
      console.log("Claimable: ", claimable);
      if (claimable > 0) {
        console.log("claiming...");
        await DepositorContract.connect(DEPOSITOR_FEE_COLLECTOR_ACCOUNT).moveRewardsToPending(j);
      }

      console.log(
        "Pending Rewards for Stream %s: %s",
        j,
        await AuroraStakingContract.getPending(j, DepositorContract.address)
      );
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});