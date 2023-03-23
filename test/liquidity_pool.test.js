// const { expect } = require("chai");
// const { ethers } = require("hardhat");
// const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

// const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

// describe("Liquidity Pool StAUR <> AURORA", function () {

// });






   



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