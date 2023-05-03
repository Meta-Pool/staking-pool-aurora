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

    const deposit = ethers.BigNumber.from(2).mul(decimals);
    await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, deposit);
    await stakedAuroraVaultContract.connect(carl).deposit(deposit, carl.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });