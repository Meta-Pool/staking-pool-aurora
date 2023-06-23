// import { ethers } from "hardhat";

async function main() {

  const USE_DUMMY_TOKENS = true;

  const decimals = ethers.BigNumber.from(10).pow(18);
  const AURORA_PLUS_CONTRACT = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
  const AURORA_TOKEN_CONTRACT = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
  const AuroraToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const [
    alice,
    bob
  ] = await ethers.getSigners();

  // const Token = await ethers.getContractFactory('Token');
  // const token = await Token.attach('0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79')
  // console.log("jose aurora tokens: %s", await token.balanceOf("0x0B438De1DCa9FBa6D14F17c1F0969ECc73C8186F"));

  // Step 1. Deploying the IMMUTABLE Staked Aurora Vault contract.
  console.log("Step 1. Deploying StakedAuroraVault...")
  const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
  const StakedAuroraVaultContract = await StakedAuroraVault.connect(alice).deploy(
    MAINNET_AURORA_TOKEN,
    "Staked Aurora Token",
    "stAUR",
    minDepositAmount
  );
  await StakedAuroraVaultContract.deployed();
  console.log(" ...done in %s!", StakedAuroraVaultContract.address);

  // Step 2. Deploying the MUTABLE Staking Manager contract.
  console.log("Step 2. Deploying StakingManager...")
  const stakingManagerContract = await StakingManager.connect(alice).deploy(
    StakedAuroraVaultContract.address,
    MAINNET_AURORA_PLUS,
    bob.address,
    10
  );
  await stakingManagerContract.deployed();
  console.log(" ...done in %s!", stakingManagerContract.address);

  // Insert/update the staking manager in the ERC-4626
  await StakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address);

  // Step 3. Deploying the multiple Depositor contracts.
  console.log("Step 5. Deploying 2 Depositor contracts...")
  const depositor00Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address
  );
  await depositor00Contract.deployed();

  const depositor01Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address
  );
  await depositor01Contract.deployed();
  console.log("       ...2 contracts deployed!");

  console.log(" - Depositor 00:      %s", depositor00Contract.address);
  console.log(" - Depositor 01:      %s", depositor01Contract.address);

  await stakingManagerContract.connect(bob).insertDepositor(depositor00Contract.address);
  await stakingManagerContract.connect(bob).insertDepositor(depositor01Contract.address);

  console.log("Addresses of the deployed contracts:")
  console.log(" - Token:             %s", MAINNET_AURORA_TOKEN);
  console.log(" - AuroraStaking:     %s", MAINNET_AURORA_PLUS);
  console.log(" - StakingManager:    %s", stakingManagerContract.address);
  console.log(" - Depositor 00:      %s", depositor00Contract.address);
  console.log(" - Depositor 01:      %s", depositor01Contract.address);
  console.log(" - StakedAuroraVault: %s", StakedAuroraVaultContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});