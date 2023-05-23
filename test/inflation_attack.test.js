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

async function printBalances(aur, stakedAuroraVault, alice, attacker) {
  console.log("\t- Attacker AUR balance: ", await aur.balanceOf(attacker.address));
  console.log("\t- Attacker stAUR balance: ", await stakedAuroraVault.balanceOf(attacker.address));
  console.log("\t- stAUR total supply: ", await stakedAuroraVault.totalSupply());
  console.log("\t- Alice AUR balance: ", await aur.balanceOf(alice.address));
  console.log("\t- Alice stAUR balance: ", await stakedAuroraVault.balanceOf(alice.address));
  console.log("");
}

describe("Staking Pool AURORA under Inflation attack.", function () {
  describe("Run Inflation attack. 💸", function () {
    it("Should be correct for all contracts initial parameters.", async function () {
      const {
        StakedAuroraVaultContract, alice, bob, impersonatedAdmin, impersonatedOperator,
        AuroraTokenContract
      } = await loadFixture(useProdForkFixture);

      // Alice is the attacker.
      // Bob is the 🐏.

      // await StakedAuroraVaultContract.connect(impersonatedOperator).updateEnforceWhitelist(false);

      console.log("getImpersonatedSigner: ", await impersonatedOperator.getBalance());

      await printBalances(AuroraTokenContract, StakedAuroraVaultContract, alice, bob);

      console.log("HEREE!!!!");
      console.log(
        "Alice Balance: %s", 
        await StakedAuroraVaultContract.balanceOf(impersonatedAdmin.address)
      );

    });

  });
});