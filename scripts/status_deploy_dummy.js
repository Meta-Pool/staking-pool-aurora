// import { ethers } from "hardhat";

async function main() {

  const AuroraTokenAddress = "0xCca0C26Be4169d7963fEC984F6EAd5F6e630B288"
  const CentauriTokenAddress = "0x6f2c4ee43D89b904e62f5F0acF68A37100C968D0"
  const AuroraStakingAddress = "0x8e6aA7a602042879074334bB6c02c40A9385F522"
  const StakingManagerAddress = "0xd44b2eC72C39538294d6e2735DcAc7BB5Ebf2cC6"
  const Depositor00Address = "0xF01d1060Fe27D69D143EB237dbC8235ED3e4FA4f"
  const Depositor01Address = "0x0C32f3824B02EC9B82598Cfe487162463579242F"
  const StakedAuroraVaultAddress = "0xD6a1BEB40523A91B8424C02517219875A5D95c01"
  const LiquidityPoolAddress = "0x9156273eE2684BE1C9F1064cCE43f30E766c8496"

  const AuroraToken = await ethers.getContractFactory("Token");
  const CentauriToken = await ethers.getContractFactory("Token");
  const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
  const StakingManager = await ethers.getContractFactory("StakingManager");
  const Depositor = await ethers.getContractFactory("Depositor");
  const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const [
    alice,
    bob
  ] = await ethers.getSigners();

  const AuroraTokenContract = await AuroraToken.attach(AuroraTokenAddress);
  const CentauriTokenContract = await CentauriToken.attach(CentauriTokenAddress);
  const AuroraStakingContract = await AuroraStaking.attach(AuroraStakingAddress);
  const StakingManagerContract = await StakingManager.attach(StakingManagerAddress);
  const Depositor00Contract = await Depositor.attach(Depositor00Address);
  const Depositor01Contract = await Depositor.attach(Depositor01Address);
  const StakedAuroraVaultContract = await StakedAuroraVault.attach(StakedAuroraVaultAddress);
  const liquidityPoolContract = await LiquidityPool.attach(LiquidityPoolAddress);

  console.log("ALICE Balance: %s", await AuroraTokenContract.balanceOf(alice.address));

  console.log("StAUR Vault:");
  console.log("stakingManager: %s", await StakedAuroraVaultContract.stakingManager());
  console.log("liquidityPool: %s", await StakedAuroraVaultContract.liquidityPool());
  console.log("minDepositAmount: %s", await StakedAuroraVaultContract.minDepositAmount());
  console.log("Fully Operational: %s", await StakedAuroraVaultContract.fullyOperational());
  console.log("Whitelist: %s", await StakedAuroraVaultContract.enforceWhitelist());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});