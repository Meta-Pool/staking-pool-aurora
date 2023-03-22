const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

describe("Liquidity Pool StAUR <> AURORA", function () {
    async function deployPoolFixture() {
        const AuroraToken = await ethers.getContractFactory("Token");
        const StAurToken = await ethers.getContractFactory("Token");



        const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
        const StakingManager = await ethers.getContractFactory("StakingManager");
        const Depositor = await ethers.getContractFactory("Depositor");
        const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    
        const [
          owner,
          depositors_owner,
          treasury,
          operator,
          alice,
          bob,
          carl
        ] = await ethers.getSigners();
    
        const decimals = ethers.BigNumber.from(10).pow(18);
        const initialSupply = ethers.BigNumber.from(10_000_000).mul(decimals);
        const auroraTokenContract = await AuroraToken.deploy(
          initialSupply,
          "Aurora Token",
          "AURORA",
          alice.address
        );
        await auroraTokenContract.deployed();
    
        // Sharing total suply with Bob and Carl.
        const splitSupply = ethers.BigNumber.from(3_000_000).mul(decimals);
        await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
        await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);
    
        const auroraStakingContract = await AuroraStaking.deploy(
          auroraTokenContract.address
        );
        await auroraStakingContract.deployed();
    
        // Send Tokens to the Aurora Staking contract to pay for rewards.
        const forRewards = ethers.BigNumber.from(1_000_000).mul(decimals);
        await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);
    
        const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
        const stakedAuroraVaultContract = await StakedAuroraVault.deploy(
          auroraTokenContract.address,
          "Staked Aurora Token",
          "stAUR",
          minDepositAmount
        );
        await stakedAuroraVaultContract.deployed();
    
        const stakingManagerContract = await StakingManager.deploy(
          stakedAuroraVaultContract.address,
          auroraStakingContract.address,
          depositors_owner.address,
          10
        );
        await stakingManagerContract.deployed();
    
        // Insert/update the staking manager in the ERC-4626
        await stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address);
    
        const depositor00Contract = await Depositor.connect(depositors_owner).deploy(
          stakingManagerContract.address
        );
        await depositor00Contract.deployed();
    
        const depositor01Contract = await Depositor.connect(depositors_owner).deploy(
          stakingManagerContract.address
        );
        await depositor01Contract.deployed();
    
        await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor00Contract.address);
        await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor01Contract.address);
    
        // Fixtures can return anything you consider useful for your tests
        return {
          auroraTokenContract,
          auroraStakingContract,
          stakedAuroraVaultContract,
          stakingManagerContract,
          depositor00Contract,
          depositor01Contract,
          owner,
          depositors_owner,
          treasury,
          operator,
          alice,
          bob,
          carl,
          decimals
        };
      }
    
      async function depositPoolFixture() {
        const {
          auroraTokenContract,
          auroraStakingContract,
          stakedAuroraVaultContract,
          stakingManagerContract,
          depositor00Contract,
          depositor01Contract,
          owner,
          depositors_owner,
          treasury,
          operator,
          alice,
          bob,
          carl,
          decimals
        } = await loadFixture(deployPoolFixture);
    
        const aliceDeposit = ethers.BigNumber.from(6_000).mul(decimals);
        await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
        await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);
    
        const bobDeposit = ethers.BigNumber.from(100_000).mul(decimals);
        await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
        await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);
    
        const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
        await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
        await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);
    
        await stakingManagerContract.cleanOrdersQueue();
    
        return {
          auroraTokenContract,
          auroraStakingContract,
          stakedAuroraVaultContract,
          stakingManagerContract,
          depositor00Contract,
          depositor01Contract,
          owner,
          depositors_owner,
          treasury,
          operator,
          alice,
          bob,
          carl,
          decimals
        };
      }
});





// const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
   
//    // deploy and initialize liquidity pool
//    const liquidityPoolContract = await LiquidityPool.deploy(
//     stakingManagerContract.address,
//     auroraTokenContract.address,
//     ethers.BigNumber.from(1).mul(decimals), // 1 Aurora
//     ethers.BigNumber.from(100).mul(decimals) // 100 Aurora
//   );
//   await liquidityPoolContract.deployed();


//   describe("Liquidity Pool", function() {
//     it("Stake Manager add liquidity", async function() {
//       const {
//         stakedAuroraVaultContract,
//         stakingManagerContract,
//         liquidityPoolContract,
//         auroraTokenContract,
//         operator,
//         alice,
//         carl,
//         decimals
//       } = await loadFixture(depositPoolFixture);

//       // allowances
//       const aliceDeposit = ethers.BigNumber.from(100).mul(decimals);
//       await auroraTokenContract.connect(alice).approve(liquidityPoolContract.address, aliceDeposit);
//       await stakedAuroraVaultContract.connect(alice).approve(liquidityPoolContract.address, aliceDeposit);
//       const carlDeposit = ethers.BigNumber.from(100).mul(decimals);
//       await auroraTokenContract.connect(carl).approve(liquidityPoolContract.address, carlDeposit);
//       await stakedAuroraVaultContract.connect(carl).approve(liquidityPoolContract.address, carlDeposit);
      
//       const prevDepositResult = await liquidityPoolContract.connect(alice).previewDeposit(aliceDeposit);
//       console.log('PREV DEPOSIT', prevDepositResult)
//       const depositResult = await liquidityPoolContract.connect(alice).deposit(aliceDeposit, alice.address);
//       console.log('PREV DEPOSIT', depositResult)


//     });
//   })