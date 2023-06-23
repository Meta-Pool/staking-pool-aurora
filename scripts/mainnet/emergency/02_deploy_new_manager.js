const hre = require("hardhat");
const { getCurrentTimestamp, getDepositorsArray } = require("../../utils");
const {
  AURORA_PLUS_ADDRESS,
  MAX_WITHDRAW_ORDERS,
  STAKED_AURORA_VAULT_ADDRESS,
  CURRENT_MANAGER_ADDRESS,
  FEE_PER_YEAR_BASIS_POINTS,
  generateAccounts
} = require("./_config");

console.log("Mr Robot 🤖 - EMERGENCY MODE 🔥 - Step 02");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { NEW_MANAGER_ADMIN_ACCOUNT, NEW_MANAGER_OPERATOR_ACCOUNT } = await generateAccounts();
  const StakingManager = await ethers.getContractFactory("StakingManager");

  console.log("Deploying StakingManager...")
  const StakingManagerContract = await StakingManager.connect(NEW_MANAGER_ADMIN_ACCOUNT).deploy(
    FEE_PER_YEAR_BASIS_POINTS,
    MAX_WITHDRAW_ORDERS,
    STAKED_AURORA_VAULT_ADDRESS,
    AURORA_PLUS_ADDRESS,
    NEW_MANAGER_OPERATOR_ACCOUNT.address,
  );
  await StakingManagerContract.deployed();
  console.log("       ...done!");
  console.log("Staking Manager Contract: %s", StakingManagerContract.address);
  console.log("⚠️ Don't forget to update the NEW_MANAGER address in config.js file.");

  const CurrentManagerContract = await StakingManager.attach(CURRENT_MANAGER_ADDRESS);
  const depositors = await getDepositorsArray(CurrentManagerContract);
  for (let i = 0; i < depositors.length; i++) {
    var request = await StakingManagerContract
      .connect(NEW_MANAGER_ADMIN_ACCOUNT)
      .insertDepositor(depositors[i]);
    console.log("INSERT DEPOSITOR %s: %s", i, request);

    // IMPORTANT - you might need to wait the tx in order to keep the array order.
    request.wait();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});