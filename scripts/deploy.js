// import { ethers } from "hardhat";

async function main() {

  const AuroraToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const [
    alice,
    bob
  ] = await ethers.getSigners();

  // Step 1. Deploying a dummy token for testing Aurora.
  const decimals = ethers.BigNumber.from(10).pow(18);
  const initialSupply = ethers.BigNumber.from(10_000_000).mul(decimals);
  const auroraTokenContract = await AuroraToken.deploy(
    initialSupply,
    "Aurora Token",
    "AURORA",
    alice.address
  );
  await auroraTokenContract.deployed();

  // Sharing total suply with Bob.
  const splitSupply = ethers.BigNumber.from(3_000_000).mul(decimals);
  await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
  // await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);

  // Step 2. Deploying a dummy staking service.
  const auroraStakingContract = await AuroraStaking.deploy(
    auroraTokenContract.address
  );
  await auroraStakingContract.deployed();

  // Send Tokens to the Aurora Staking contract to pay for rewards.
  const forRewards = ethers.BigNumber.from(1_000_000).mul(decimals);
  await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);

  // Step 3. Deploying the IMMUTABLE Staked Aurora Vault contract.
  const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
  const stakedAuroraVaultContract = await StakedAuroraVault.deploy(
    auroraTokenContract.address,
    "Staked Aurora Token",
    "stAUR",
    minDepositAmount
  );
  await stakedAuroraVaultContract.deployed();

  // Step 4. Deploying the MUTABLE Staking Manager contract.
  const stakingManagerContract = await StakingManager.deploy(
    stakedAuroraVaultContract.address,
    auroraStakingContract.address,
    bob.address,
    10
  );
  await stakingManagerContract.deployed();

  // Insert/update the staking manager in the ERC-4626
  await stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address);

  const depositor00Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address
  );
  await depositor00Contract.deployed();

  const depositor01Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address
  );
  await depositor01Contract.deployed();

  await stakingManagerContract.connect(bob).insertDepositor(depositor00Contract.address);
  await stakingManagerContract.connect(bob).insertDepositor(depositor01Contract.address);

  console.log("Addresses of the deployed contracts:")
  console.log(" - Token:             %s", auroraTokenContract.address);
  console.log(" - AuroraStaking:     %s", auroraStakingContract.address);
  console.log(" - StakingManager:    %s", stakingManagerContract.address);
  console.log(" - Depositor 00:      %s", depositor00Contract.address);
  console.log(" - Depositor 01:      %s", depositor01Contract.address);
  console.log(" - StakedAuroraVault: %s", stakedAuroraVaultContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});