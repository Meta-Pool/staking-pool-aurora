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

describe("Staking Pool AURORA under Inflation attack.", function () {
  describe("Run Inflation attack. 💸", function () {
    it("Should be correct for all contracts initial parameters.", async function () {
      const {
        StakedAuroraVaultContract, alice, impersonatedAdmin
      } = await loadFixture(useProdForkFixture);

      console.log("HEREE!!!!");
      console.log(
        "Alice Balance: %s", 
        await StakedAuroraVaultContract.balanceOf(impersonatedAdmin.address)
      );

    });

  });
});