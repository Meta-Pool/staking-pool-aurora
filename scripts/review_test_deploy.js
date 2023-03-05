// import { ethers } from "hardhat";

async function main() {
  const AuroraTokenAddress = "0xB0Ac0da82FF21027D1d1aB13AE67e9C7953AA66e";
  const AuroraStakingAddress = "0xba63a349Fc594B2255e9541C49DA58fAf7a2A53C";
  const StakingManagerAddress = "0x2C5981D82Ca960602B2e829a0DAa1bDA56CA2c44";
  const Depositor00Address = "0xBFfcc6517e372bF28909940A5Ee49b5AE4C8d466";
  const Depositor01Address = "0x244AfCd5a0bc8A4400c6702C6a2A7717945c5e70";
  const StakedAuroraVaultAddress = "0x0f4967Ff6387798958fF143DAA00E0D98Fd26b46";

  const AuroraToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const [
    alice,
    bob
  ] = await ethers.getSigners();

  const AuroraTokenContract = await AuroraToken.attach(AuroraTokenAddress);
  const AuroraStakingContract = await AuroraStaking.attach(AuroraStakingAddress);
  const StakingManagerContract = await StakingManager.attach(StakingManagerAddress);
  const Depositor00Contract = await Depositor.attach(Depositor00Address);
  const Depositor01Contract = await Depositor.attach(Depositor01Address);
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(StakedAuroraVaultAddress);

  console.log("ALICE Balance: %s", await AuroraTokenContract.balanceOf(alice.address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});