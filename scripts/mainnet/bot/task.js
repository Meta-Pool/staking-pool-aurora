const hre = require("hardhat");
const { getCurrentTimestamp, getDepositorsArray } = require("../utils");
const { AURORA_PLUS_ADDRESS, STAKING_MANAGER_ADDRESS, generateAccounts } = require("./config");

console.log("Mr Robot 🤖");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { VAULT_ADMIN_ACCOUNT } = await generateAccounts();

  // const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");

  // const AuroraStakingContract = await AuroraStaking.attach(AURORA_PLUS_ADDRESS);
  const StakingManagerContract = await StakingManager.attach(STAKING_MANAGER_ADDRESS);

  // View the next time for run.
  const nextCleanTimestamp = await StakingManagerContract.nextCleanOrderQueue();

  console.log("Next time to clean the orders queue: %s", nextCleanTimestamp);
  console.log("Should Mr Robot run again: %s", nextCleanTimestamp < getCurrentTimestamp());

  // INSERT CODE HERE!

  const depositors = await getDepositorsArray(StakingManagerContract);
  const requests = [];
  for (let i = 0; i < depositors.length; i++) {
    const contract = await Depositor.attach(depositors[i]);

    // TODO: ⚠️ You might need to do this for more streamIds.
    var pendingRewards = await contract.getPendingRewards(1);
    console.log("pending REWARDS: %s", pendingRewards);
    // const request01 = await contract.connect(DEPOSITOR_ADMIN_ACCOUNT).updateStakingManager(
    //   NEW_MANAGER_ADDRESS
    // );
    // requests.push(request01);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});