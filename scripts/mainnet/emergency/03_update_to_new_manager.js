const hre = require("hardhat");

const {
  CURRENT_MANAGER_ADDRESS,
  STAKED_AURORA_VAULT_ADDRESS,
  NEW_MANAGER_ADDRESS,
  generateAccounts
} = require("./_config");
const { getCurrentTimestamp, getDepositorsArray } = require("../utils");

console.log("Mr Robot 🤖 - EMERGENCY MODE 🔥 - Step 03");
console.log("Started at: %s", getCurrentTimestamp());
console.log("Network: %s", hre.network.name);
console.log("-------------------------")

async function main() {
  const { DEPOSITOR_ADMIN_ACCOUNT, VAULT_ADMIN_ACCOUNT } = await generateAccounts();
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");

  const CurrentManagerContract = await StakingManager.attach(CURRENT_MANAGER_ADDRESS);
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(STAKED_AURORA_VAULT_ADDRESS);

  console.log("Step 1. Updating the Vault.");
  const request01 = await StakedAuroraVaultContract
    .connect(VAULT_ADMIN_ACCOUNT)
    .updateStakingManager(NEW_MANAGER_ADDRESS);
  console.log("REQUEST: %s\n", request01);

  console.log("\nStep 2. Update depositors.");
  const depositors = await getDepositorsArray(CurrentManagerContract);
  const requests = new Array();
  for (let i = 0; i < depositors.length; i++) {
    const contract = await Depositor.attach(depositors[i]);
    const request01 = await contract.connect(DEPOSITOR_ADMIN_ACCOUNT).updateStakingManager(
      NEW_MANAGER_ADDRESS
    );
    requests.push(request01);
  }

  // Print the request.
  for (let i = 0; i < requests.length; i++) {
    console.log("DEPOSITOR %s: %s\n", i, requests[i]);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});