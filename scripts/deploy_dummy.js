const { expect } = require("chai");

async function main() {

  const TEST_RELEASE = " v0.1.0-a2"
  const TEST_RELEASE_SHORT = "a2"
  const MAX_WITHDRAW_ORDERS = 20;
  const MAX_DEPOSITORS = 3;
  const DECIMALS = ethers.BigNumber.from(10).pow(18);
  const AuroraToken = await ethers.getContractFactory("Token");
  const CentauriToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const [
    alice,
    bob
  ] = await ethers.getSigners();

  // ----------------- Step 1. Deploying a dummy token for testing Aurora.
  console.log("Step 1. Deploying AuroraToken...")
  const initialSupply = ethers.BigNumber.from(10_000_000).mul(DECIMALS);
  const auroraTokenContract = await AuroraToken.connect(alice).deploy(
    initialSupply,
    "Aurora Token".concat(TEST_RELEASE),
    "AURORA".concat(TEST_RELEASE_SHORT),
    alice.address
  );
  await auroraTokenContract.deployed();
  console.log("       ...done in %s!", auroraTokenContract.address);

  // Sharing total suply with Bob.
  const splitSupply = ethers.BigNumber.from(3_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);

  // ----------------- Step 2. Deploying a dummy token for testing rewards.
  console.log("Step 2. Deploying CentauriToken...")
  const centauriInitialSupply = ethers.BigNumber.from(200_000).mul(DECIMALS);
  const centauriTokenContract = await CentauriToken.connect(alice).deploy(
    centauriInitialSupply,
    "Centauri Token".concat(TEST_RELEASE),
    "CENTAURI".concat(TEST_RELEASE_SHORT),
    alice.address
  );
  await centauriTokenContract.deployed();
  console.log("       ...done in %s!", centauriTokenContract.address);

  // ----------------- Step 3. Deploying a dummy staking service.
  console.log("Step 3. Deploying AuroraStaking...")
  const auroraStakingContract = await AuroraStaking.connect(alice).deploy(
    auroraTokenContract.address,
    centauriTokenContract.address
  );
  await auroraStakingContract.deployed();
  console.log("       ...done in %s!", auroraStakingContract.address);

  // Send Tokens to the Aurora Staking contract to pay for rewards.
  const forRewards = ethers.BigNumber.from(1_000_000).mul(DECIMALS);
  await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);
  
  // Send all Centauri Tokens to the Aurora Staking contract.
  await centauriTokenContract.connect(alice).transfer(auroraStakingContract.address, centauriInitialSupply);

  // ----------------- Step 4. Deploying the IMMUTABLE Staked Aurora Vault contract.
  console.log("Step 4. Deploying StakedAuroraVault...")
  const minDepositAmount = ethers.BigNumber.from(1).mul(DECIMALS);
  const stakedAuroraVaultContract = await StakedAuroraVault.connect(alice).deploy(
    auroraTokenContract.address,
    "Staked Aurora Token".concat(TEST_RELEASE),
    "stAUR".concat(TEST_RELEASE_SHORT),
    minDepositAmount
  );
  await stakedAuroraVaultContract.deployed();
  console.log("       ...done in %s!", stakedAuroraVaultContract.address);

  // ----------------- Step 5. Deploying the MUTABLE Staking Manager contract.
  console.log("Step 5. Deploying StakingManager...")
  const stakingManagerContract = await StakingManager.connect(alice).deploy(
    stakedAuroraVaultContract.address,
    auroraStakingContract.address,
    bob.address,
    bob.address,
    MAX_WITHDRAW_ORDERS,
    MAX_DEPOSITORS
  );
  await stakingManagerContract.deployed();
  console.log("       ...done in %s!", stakingManagerContract.address);

   // ----------------- Step 6. Deploying the MUTABLE Liquidity Pool contract.
   console.log("Step 6. Deploying LiquidityPool...")
   const liquidityPoolContract = await LiquidityPool.connect(alice).deploy(
    stakedAuroraVaultContract.address,
    auroraTokenContract.address,
    "stAUR/AURORA LP Token".concat(TEST_RELEASE),
    "stAUR/AUR".concat(TEST_RELEASE_SHORT),
    minDepositAmount,
    200 // Swap fee basis points
  );
  await liquidityPoolContract.deployed();
  console.log("       ...done in %s!", liquidityPoolContract.address);

  // Insert/update the staking manager in the ERC-4626
  await stakedAuroraVaultContract.initializeStakingManager(stakingManagerContract.address);

  // ----------------- Step 7. Deploying the multiple Depositor contracts.
  console.log("Step 7. Deploying 2 Depositor contracts...")
  const depositor00Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address,
    bob.address
  );
  await depositor00Contract.deployed();

  // Insert/update the liquidity pool in the vault.
  await stakedAuroraVaultContract.initializeLiquidityPool(liquidityPoolContract.address);

  const depositor01Contract = await Depositor.connect(bob).deploy(
    stakingManagerContract.address,
    bob.address
  );
  await depositor01Contract.deployed();

  // Whitelist all.
  await stakedAuroraVaultContract.toggleEnforceWhitelist();

  console.log("       ...2 contracts deployed!");
  console.log("       ... %s!", depositor00Contract.address);
  console.log("       ... %s!", depositor01Contract.address);

  await stakingManagerContract.connect(bob).insertDepositor(depositor00Contract.address);
  await stakingManagerContract.connect(bob).insertDepositor(depositor01Contract.address);

  // // Staking Aurora Vault should be fully operational by now.
  // expect(await stakedAuroraVaultContract.fullyOperational()).to.be.true;
  // expect(await stakedAuroraVaultContract.enforceWhitelist()).to.be.false;

  console.log("Addresses of the deployed contracts:")
  console.log(" - AuroraToken 💚: ----- %s", auroraTokenContract.address);
  console.log(" - CentauriToken 🪐: --- %s", centauriTokenContract.address);
  console.log(" - AuroraStaking: ------ %s", auroraStakingContract.address);
  console.log(" - StakingManager: ----- %s", stakingManagerContract.address);
  console.log(" - Depositor 00: ------- %s", depositor00Contract.address);
  console.log(" - Depositor 01: ------- %s", depositor01Contract.address);
  console.log(" - StakedAuroraVault: -- %s", stakedAuroraVaultContract.address);
  console.log(" - LiquidityPool: ------ %s", liquidityPoolContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});