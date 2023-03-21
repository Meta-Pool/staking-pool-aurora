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