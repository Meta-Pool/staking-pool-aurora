const { DECIMALS } = require("./_config");

async function main() {
  // stAUR Vault and Liquidity Pool Params
  const MAX_WITHDRAW_ORDERS = 100;
  const MIN_DEPOSIT_AMOUNT = ethers.BigNumber.from(1).mul(DECIMALS);
  const SWAP_FEE_BASIS_POINTS = 200;            // 2.00%
  const LIQ_PROV_FEE_CUT_BASIS_POINTS = 8000;   // 80.00%

  // stAUR Fee Mint.
  const FEE_PER_YEAR_BASIS_POINTS = 500;        // 5.00%

  // AURORA Addresses in production.
  const AURORA_TOKEN_ADDRESS = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
  const AURORA_PLUS_ADDRESS = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
  const [
    ADMIN_ACCOUNT,
    OPERATOR_ACCOUNT,
    TREASURY_ACCOUNT,
    DEPOSITOR_FEE_COLLECTOR_ACCOUNT
  ] = await ethers.getSigners();

  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const Router = await ethers.getContractFactory("ERC4626Router");

  // ----------------- Step 1. Deploying the Staked Aurora Vault contract.
  console.log("Step 1. Deploying StakedAuroraVault...")
  const StakedAuroraVaultContract = await StakedAuroraVault.connect(ADMIN_ACCOUNT).deploy(
    MIN_DEPOSIT_AMOUNT,
    OPERATOR_ACCOUNT.address,
    AURORA_TOKEN_ADDRESS,
    "Staked Aurora Token",
    "stAUR"
  );
  await StakedAuroraVaultContract.deployed();
  console.log("       ...done in %s!", StakedAuroraVaultContract.address);

  // ----------------- Step 2. Deploying the Staking Manager contract.
  console.log("Step 2. Deploying StakingManager...")
  const stakingManagerContract = await StakingManager.connect(ADMIN_ACCOUNT).deploy(
    FEE_PER_YEAR_BASIS_POINTS,
    MAX_WITHDRAW_ORDERS,
    StakedAuroraVaultContract.address,
    AURORA_PLUS_ADDRESS,
    OPERATOR_ACCOUNT.address,
    TREASURY_ACCOUNT.address
  );
  await stakingManagerContract.deployed();
  console.log("       ...done in %s!", stakingManagerContract.address);

   // ----------------- Step 3. Deploying the Liquidity Pool contract.
   console.log("Step 3. Deploying LiquidityPool...")
   const liquidityPoolContract = await LiquidityPool.connect(ADMIN_ACCOUNT).deploy(
    StakedAuroraVaultContract.address,
    AURORA_TOKEN_ADDRESS,
    TREASURY_ACCOUNT.address,
    OPERATOR_ACCOUNT.address,
    "stAUR/AURORA LP Token",
    "stAUR/AUR",
    MIN_DEPOSIT_AMOUNT,
    SWAP_FEE_BASIS_POINTS,
    LIQ_PROV_FEE_CUT_BASIS_POINTS
  );
  await liquidityPoolContract.deployed();
  console.log("       ...done in %s!", liquidityPoolContract.address);

  // Initialize the Liquid Staking Service.
  const request01 = await StakedAuroraVaultContract
    .connect(ADMIN_ACCOUNT)
    .initializeLiquidStaking(
      stakingManagerContract.address,
      liquidityPoolContract.address
    );
  console.log("Step 4. Initializing the Vault: \n%s", request01);
  await request01.wait();

  // ----------------- Step 5. Deploying the multiple Depositor contracts.
  console.log("Step 5. Deploying 2 Depositor contracts...")
  const depositor00Contract = await Depositor.connect(ADMIN_ACCOUNT).deploy(
    stakingManagerContract.address,
    DEPOSITOR_FEE_COLLECTOR_ACCOUNT.address
  );
  await depositor00Contract.deployed();

  const depositor01Contract = await Depositor.connect(ADMIN_ACCOUNT).deploy(
    stakingManagerContract.address,
    DEPOSITOR_FEE_COLLECTOR_ACCOUNT.address
  );
  await depositor01Contract.deployed();

  console.log("       ...2 contracts deployed!");
  console.log("       ... %s!", depositor00Contract.address);
  console.log("       ... %s!", depositor01Contract.address);

  const request02 = await stakingManagerContract
    .connect(ADMIN_ACCOUNT)
    .insertDepositor(depositor00Contract.address);
  console.log("Step 6. Insert Depositor 00: \n%s", request02);
  await request02.wait();

  const request03 = await stakingManagerContract
    .connect(ADMIN_ACCOUNT)
    .insertDepositor(depositor01Contract.address);
  console.log("Step 7. Insert Depositor 01: \n%s", request02);
  await request03.wait();

  // Deploy Router 🛜 and whitelist on Vault.
  console.log("Step 8. Deploying the ERC4626 Router...")
  const RouterContract = await Router.connect(ADMIN_ACCOUNT).deploy();
  await RouterContract.deployed();

  console.log("Addresses of the deployed contracts:")
  console.log(" - AuroraToken 💚: ----- %s", AURORA_TOKEN_ADDRESS);
  console.log(" - AuroraPlus: --------- %s", AURORA_PLUS_ADDRESS);
  console.log(" - StakingManager: ----- %s", stakingManagerContract.address);
  console.log(" - Depositor 00: ------- %s", depositor00Contract.address);
  console.log(" - Depositor 01: ------- %s", depositor01Contract.address);
  console.log(" - StakedAuroraVault: -- %s", StakedAuroraVaultContract.address);
  console.log(" - LiquidityPool: ------ %s", liquidityPoolContract.address);
  console.log(" - ERC4626Router: ------ %s", RouterContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});