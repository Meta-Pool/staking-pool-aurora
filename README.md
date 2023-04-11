# Staking Pool Aurora

Meta Staking pool in Aurora.

# Aurora Bounty ETHDenver2023

We have been working on the stAUR, which is the liquid staking token that represent a proportion of the total Auroras staked into Aurora.plus by the N number of depositors. A good number of depositors to start with is with 3.

The **Depositors** are smart contracts that deposit Aurora into the staking service. The objective of spliting the deposits into multiple depositors is to allow deposits from one depositor, keeping the other two of them without the redeem penalization.

Three different contracts are needed to be deployed.

- The stAUR fungible token: ERC20, ERC4626.
- The staking manager is the contract than contains all the logic to stake, unstake and the stAUR-AURORA liquidity pool.
- The depositors are separated smart contracts that have the logic to deposit and withdraw from the Aurora plus staking service.

Using the Aurora SDK, after the liquidity pool is developed, the stAUR token could be used directy in Meta Yield.

![Architecture](media/stakingAurora.png)

Address for the Staking Pool in Aurora Mainnet.

```js
  // These are the addresses of the Aurora Token and Aurora Plus in Mainnet.
  const TokenAddress = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
  const AuroraStakingAddress = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";

  // These are the addresses of the contracts Meta Pool deployed.
  const StakingManagerAddress = "0xd239cd3A5Dec2d2cb12fB8eC512Fe3790FA2cD0e";
  const Depositor00Address = "0x6fA37581EBA252C08240c85f30fA8A5e3462c09d";
  const Depositor01Address = "0x31e0752Deb99f1fCE9701Dc5611A1652189dEdC3";
  const StakedAuroraVaultAddress = "0xA68118a4A067354A73C657300337d08E9753fB3D";
```

Try me in Aurora Mainnet:

We started with 100 Aurora tokens. 20 were sent to Alice and 40 to Bob. Alice deposited 20 Aurora and received 20 stAUR, since this was the first deposit the ratio is 1-by-1. The next deposit is for 35 Auroras and Bob received `34.999`.

```sh
npx hardhat run scripts/check_status.js --network aurora_mainnet
# Contract status: =================================
# alice stAUR: 20000000000000000000
# alice AUROR: 0
# bob stAUR: 34999923905739695523
# bob AUROR: 5000000000000000000
```





# Deployment in Goerli

First, the contracts will be deployed in ETH Goerli, using the two `testing/` contracts for the Aurora Staking service and the Aurora token.



Addresses of the deployed contracts:
 - Token:             0xB0Ac0da82FF21027D1d1aB13AE67e9C7953AA66e
 - AuroraStaking:     0xba63a349Fc594B2255e9541C49DA58fAf7a2A53C
 - StakingManager:    0x2C5981D82Ca960602B2e829a0DAa1bDA56CA2c44
 - Depositor 00:      0xBFfcc6517e372bF28909940A5Ee49b5AE4C8d466
 - Depositor 01:      0x244AfCd5a0bc8A4400c6702C6a2A7717945c5e70
 - StakedAuroraVault: 0x0f4967Ff6387798958fF143DAA00E0D98Fd26b46