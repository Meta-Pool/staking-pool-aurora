// import { ethers } from "hardhat";

async function main() {

    const TokenAddress = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
    const AuroraStakingAddress = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
    const StakingManagerAddress = "0xd239cd3A5Dec2d2cb12fB8eC512Fe3790FA2cD0e";
    const Depositor00Address = "0x6fA37581EBA252C08240c85f30fA8A5e3462c09d";
    const Depositor01Address = "0x31e0752Deb99f1fCE9701Dc5611A1652189dEdC3";
    const StakedAuroraVaultAddress = "0xA68118a4A067354A73C657300337d08E9753fB3D";
  
    const [
      alice,
      bob
    ] = await ethers.getSigners();
  
    const decimals = ethers.BigNumber.from(10).pow(18);
  
    const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    const stakedAuroraVaultContract = await StakedAuroraVault.attach(StakedAuroraVaultAddress);
    const AuroraToken = await ethers.getContractFactory("Token");
    const auroraTokenContract = await AuroraToken.attach(TokenAddress);
  
    // const aliceDeposit = ethers.BigNumber.from(20).mul(decimals);
    // await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
    // await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

    console.log("Contract status: =================================");

    console.log("alice stAUR: %s", await stakedAuroraVaultContract.balanceOf(alice.address));
    console.log("alice AUROR: %s", await auroraTokenContract.balanceOf(alice.address));

    console.log("bob stAUR: %s", await stakedAuroraVaultContract.balanceOf(bob.address));
    console.log("bob AUROR: %s", await auroraTokenContract.balanceOf(bob.address));
  
  
  
    // const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
    // const StakingManager = await ethers.getContractFactory("StakingManager");
    // const Depositor = await ethers.getContractFactory("Depositor");
    // const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    // const [
    //   alice,
    //   bob
    // ] = await ethers.getSigners();
  
    // // const Token = await ethers.getContractFactory('Token');
    // // const token = await Token.attach('0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79')
    // // console.log("jose aurora tokens: %s", await token.balanceOf("0x0B438De1DCa9FBa6D14F17c1F0969ECc73C8186F"));
  
    // // Step 1. Deploying the IMMUTABLE Staked Aurora Vault contract.
    // console.log("Step 1. Deploying StakedAuroraVault...")
    // const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
    // const stakedAuroraVaultContract = await StakedAuroraVault.connect(alice).deploy(
    //   MAINNET_AURORA_TOKEN,
    //   "Staked Aurora Token",
    //   "stAUR",
    //   minDepositAmount
    // );
    // await stakedAuroraVaultContract.deployed();
    // console.log(" ...done in %s!", stakedAuroraVaultContract.address);
  
    // // Step 2. Deploying the MUTABLE Staking Manager contract.
    // console.log("Step 2. Deploying StakingManager...")
    // const stakingManagerContract = await StakingManager.connect(alice).deploy(
    //   stakedAuroraVaultContract.address,
    //   MAINNET_AURORA_PLUS,
    //   bob.address,
    //   10
    // );
    // await stakingManagerContract.deployed();
    // console.log(" ...done in %s!", stakingManagerContract.address);
  
    // // Insert/update the staking manager in the ERC-4626
    // await stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address);
  
    // // Step 3. Deploying the multiple Depositor contracts.
    // console.log("Step 5. Deploying 2 Depositor contracts...")
    // const depositor00Contract = await Depositor.connect(bob).deploy(
    //   stakingManagerContract.address
    // );
    // await depositor00Contract.deployed();
  
    // const depositor01Contract = await Depositor.connect(bob).deploy(
    //   stakingManagerContract.address
    // );
    // await depositor01Contract.deployed();
    // console.log("       ...2 contracts deployed!");
  
    // console.log(" - Depositor 00:      %s", depositor00Contract.address);
    // console.log(" - Depositor 01:      %s", depositor01Contract.address);
  
    // await stakingManagerContract.connect(bob).insertDepositor(depositor00Contract.address);
    // await stakingManagerContract.connect(bob).insertDepositor(depositor01Contract.address);
  
    // console.log("Addresses of the deployed contracts:")
    // console.log(" - Token:             %s", MAINNET_AURORA_TOKEN);
    // console.log(" - AuroraStaking:     %s", MAINNET_AURORA_PLUS);
    // console.log(" - StakingManager:    %s", stakingManagerContract.address);
    // console.log(" - Depositor 00:      %s", depositor00Contract.address);
    // console.log(" - Depositor 01:      %s", depositor01Contract.address);
    // console.log(" - StakedAuroraVault: %s", stakedAuroraVaultContract.address);
  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });