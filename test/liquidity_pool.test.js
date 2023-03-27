const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployPoolFixture, liquidityPoolFixture } = require("./load_fixtures");

const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

describe("Liquidity Pool StAUR <> AURORA", function () {
  describe("Deployment", function () {
    it("Should be correct for LP contract initial parameters.", async function () {
      const {
        auroraTokenContract,
        liquidityPoolContract,
        liquidity_pool_owner,
        stakedAuroraVaultContract
      } = await loadFixture(deployPoolFixture);

      expect(await liquidityPoolContract.owner()).to.equal(liquidity_pool_owner.address);
      expect(await liquidityPoolContract.stAurVault()).to.equal(stakedAuroraVaultContract.address);
      expect(await liquidityPoolContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await liquidityPoolContract.stAurBalance()).to.equal(0);
      expect(await liquidityPoolContract.auroraBalance()).to.equal(0);
      expect(await liquidityPoolContract.swapFeeBasisPoints()).to.equal(200);
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob, Carl and Liq Provider.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        liquidityPoolContract,
        liquidity_provider,
        alice,
        bob,
        carl
      } = await loadFixture(liquidityPoolFixture);

      // AURORA tokens in the users balances.
      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      const stakingBalance = await auroraTokenContract.balanceOf(auroraStakingContract.address);
      const liquidityBalance = await auroraTokenContract.balanceOf(liquidity_provider.address);

      // AURORA tokens in the liquidity pool.
      const lpTokenBalance = await liquidityPoolContract.balanceOf(liquidity_provider.address);
      const poolBalance = await liquidityPoolContract.convertToAssets(lpTokenBalance);

      expect(await auroraTokenContract.totalSupply()).to.equal(
        aliceBalance.add(bobBalance).add(carlBalance).add(stakingBalance).add(liquidityBalance).add(poolBalance));
    });
  });
});






   



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