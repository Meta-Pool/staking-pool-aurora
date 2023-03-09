// import { ethers } from "hardhat";

async function main() {

    // AURORA token and AURORA plus Address in Mainnet.
    const TokenAddress = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
    const AuroraStakingAddress = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";

    // Meta Pool Addresses.
    const Depositor00Address = "0x6fA37581EBA252C08240c85f30fA8A5e3462c09d";
    const Depositor01Address = "0x31e0752Deb99f1fCE9701Dc5611A1652189dEdC3";
    const StakedAuroraVaultAddress = "0xA68118a4A067354A73C657300337d08E9753fB3D";
    const StakingManagerAddress = "0xd239cd3A5Dec2d2cb12fB8eC512Fe3790FA2cD0e";
  
    const [alice, bob, carl] = await ethers.getSigners();
    const decimals = ethers.BigNumber.from(10).pow(18);
  
    // Attaching contract addresses to the interfaces.
    const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
    const AuroraToken = await ethers.getContractFactory("Token");
    const Depositor00 = await ethers.getContractFactory("Depositor");
    const Depositor01 = await ethers.getContractFactory("Depositor");
    const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    const StakingManager = await ethers.getContractFactory("StakingManager");

    const auroraStakingContract = await AuroraStaking.attach(AuroraStakingAddress);
    const auroraTokenContract = await AuroraToken.attach(TokenAddress);
    const depositor00Contract = await Depositor00.attach(Depositor00Address);
    const depositor01Contract = await Depositor01.attach(Depositor01Address);
    const stakedAuroraVaultContract = await StakedAuroraVault.attach(StakedAuroraVaultAddress);
    const stakingManagerContract = await StakingManager.attach(StakingManagerAddress);

    console.log("User current Balances: =================================");
    console.log("Alice stAUR: %s", await stakedAuroraVaultContract.balanceOf(alice.address));
    console.log("Alice AUROR: %s", await auroraTokenContract.balanceOf(alice.address));
    console.log("--------");
    console.log("Bob   stAUR: %s", await stakedAuroraVaultContract.balanceOf(bob.address));
    console.log("Bob   AUROR: %s", await auroraTokenContract.balanceOf(bob.address));
    console.log("--------");
    console.log("Carl  stAUR: %s", await stakedAuroraVaultContract.balanceOf(carl.address));
    console.log("Carl  AUROR: %s", await auroraTokenContract.balanceOf(carl.address));
    console.log("\n");
  
    console.log("Depositors Staked Assets: =================================");
    console.log("Total Deposi Assets: %s", await stakingManagerContract.totalAssets());
    console.log("--------");
    console.log("Depositor00 Deposit: %s", await auroraStakingContract.getUserTotalDeposit(Depositor00Address));
    console.log("Depositor01 Deposit: %s", await auroraStakingContract.getUserTotalDeposit(Depositor01Address));
    console.log("--------");
    console.log("Depositor00 Shares: %s", await auroraStakingContract.getUserShares(Depositor00Address));
    console.log("Depositor01 Shares: %s", await auroraStakingContract.getUserShares(Depositor01Address));
    console.log("\n");

    console.log("Withdraw Flow: =================================");
    console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
    console.log("Alice pending assets: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
    console.log("Alice availab assets: %s", await stakingManagerContract.getAvailableAssets(alice.address));
    console.log("--------");
    console.log("Bob   withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
    console.log("Bob   pending assets: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
    console.log("Bob   availab assets: %s", await stakingManagerContract.getAvailableAssets(alice.address));
    console.log("--------");
    console.log("Carl  withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
    console.log("Carl  pending assets: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
    console.log("Carl  availab assets: %s", await stakingManagerContract.getAvailableAssets(alice.address));

  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });