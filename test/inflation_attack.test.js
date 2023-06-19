const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployPoolFixture,
  depositPoolFixture,
  liquidityPoolFixture,
  botsHordeFixture,
  useProdForkFixture,
  AURORA,
  DECIMALS,
  TOTAL_SPAMBOTS,
  ADMIN_ROLE,
  OPERATOR_ROLE,
  COLLECT_REWARDS_ROLE
} = require("./test_setup");

async function printBalances(aur, stakedAuroraVault, attacker, alice) {
  console.log("\t- Attacker AUR balance: ", await aur.balanceOf(attacker.address));
  console.log("\t- Attacker stAUR balance: ", await stakedAuroraVault.balanceOf(attacker.address));
  console.log("\t- stAUR total supply: ", await stakedAuroraVault.totalSupply());
  console.log("\t- Alice AUR balance: ", await aur.balanceOf(alice.address));
  console.log("\t- Alice stAUR balance: ", await stakedAuroraVault.balanceOf(alice.address));
  console.log("");
}

// describe("Staking Pool AURORA under Inflation attack.", function () {
//   describe("Run Inflation attack. 💸 Halborn replica 🐸.", function () {
//     it("Should be correct for all contracts initial parameters.", async function () {
//       const {
//         StakedAuroraVaultContract, alice, bob, impersonatedAdmin, impersonatedOperator,
//         AuroraTokenContract
//       } = await loadFixture(useProdForkFixture);

//       // Bob is the attacker.
//       // Alice is the 🐏.
//       const attacker = bob;

//       // Get the Balance in AURORA ETH.
//       const provider = ethers.getDefaultProvider();

//       console.log("Alice: %s", await provider.getBalance(alice.address));
//       console.log("Attacker: %s", await provider.getBalance(attacker.address));
//       console.log("impersonatedAdmin: %s", await provider.getBalance(impersonatedAdmin.address));

//       await AuroraTokenContract.connect(impersonatedAdmin).transfer(
//         attacker.address,
//         ethers.BigNumber.from(200).mul(DECIMALS)
//       );

//       await AuroraTokenContract.connect(impersonatedAdmin).transfer(
//         alice.address,
//         ethers.BigNumber.from(200).mul(DECIMALS)
//       );

//       await StakedAuroraVaultContract.connect(impersonatedOperator).updateEnforceWhitelist(false);

//       console.log("[-] Initial balances:");
//       await printBalances(AuroraTokenContract, StakedAuroraVaultContract, attacker, alice);

//       // Start prank (ATTACKER);
//       await AuroraTokenContract.connect(attacker).approve(
//         StakedAuroraVaultContract.address,
//         ethers.BigNumber.from(100).mul(DECIMALS).add(1)
//       );
//       await StakedAuroraVaultContract.connect(attacker).deposit(
//         ethers.BigNumber.from(100).mul(DECIMALS).add(1),
//         attacker.address
//       );

//       // console.log("[*] After ATTACKER's deposit:");
//       // await printBalances(AuroraTokenContract, StakedAuroraVaultContract, attacker, alice);

//       // await StakedAuroraVaultContract.connect(alice).burn(
//       //   ethers.BigNumber.from(100).mul(DECIMALS)
//       // );

//       // console.log("[*] After ATTACKER's inflation:");
//       // await printBalances(AuroraTokenContract, StakedAuroraVaultContract, attacker, alice);

//       // await AuroraTokenContract.connect(bob).approve(
//       //   StakedAuroraVaultContract.address,
//       //   ethers.BigNumber.from(200).mul(DECIMALS)
//       // );
//       // await StakedAuroraVaultContract.connect(bob).deposit(
//       //   ethers.BigNumber.from(200).mul(DECIMALS),
//       //   bob.address
//       // );

//       // console.log("[+] Victim deposit tokens:");
//       // await printBalances(AuroraTokenContract, StakedAuroraVaultContract, attacker, alice);
            

//       // console.log("HEREE!!!!");
//       // console.log(
//       //   "Alice Balance: %s",
//       //   await StakedAuroraVaultContract.balanceOf(impersonatedAdmin.address)
//       // );

//     });

//   });
// });
