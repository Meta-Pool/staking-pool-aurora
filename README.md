# Staking Pool Aurora

Meta Staking pool in Aurora. The stAUR 🪐 token.

# Versions

The last version of the deployed contract, in AURORA `mainnet`, is in the `stable` branch.

Current stable version: [**v0.2.1**](https://github.com/Meta-Pool/staking-pool-aurora/releases/tag/v0.2.1)
Check all releases in [stAUR Releases](https://github.com/Meta-Pool/staking-pool-aurora/releases).

To get the stable version, run the commands:

```sh
git clone https://github.com/Meta-Pool/staking-pool-aurora.git
cd staking-pool-aurora
git fetch origin --tags

git checkout tags/v0.2.1 -b stable
```

# Addresses in AURORA 🈯️ `mainnet`

Address for the Staking Pool in Aurora Mainnet.

```bash
Addresses of the deployed contracts:
 - AuroraToken 💚: ----- 0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79
 - AuroraPlus: --------- 0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec
 - StakingManager: ----- 0x0db2E0AF08757b1a50768a59C27D3EEE716809c0
 - Depositor 00: ------- 0xa1B107aF89c773e73F3cb796368953566e6D9Cd1
 - Depositor 01: ------- 0xF86100ce765cAE7E6C2aBD1e7555924677EFf7C7
 - StakedAuroraVault: -- 0x2262148E0d327Fa4bcC7882c0f2Bb2D4139Cd0E7
 - LiquidityPool: ------ 0x4162858459aE2B949Bc24d5383e33963A46CBB63
 - ERC4626Router: ------ 0x21DEe40eFebB1F68D58FC2e2b6a0d2D0c7e87403
```

# Use the Router 🛜

The `ERC4626Router` help the user to avoid slippage issues.

# Quick run

If you already have all the dependencies installed.

```sh
# Using the Makefile
make buld
make test
```

# Introduction

Finally, the `stAUR` 🪐 token is in the wild, live on AURORA `mainnet`.

The `stAUR` 🪐 token is the **Liquid Staking** token that represents a proportion of the total AURORA tokens staked in the [**Aurora Plus**](https://aurora.plus/) staking service. The staking is done through an additional smart contracts called **Depositors**. A good number of depositors to start with is two.

The **Depositors** are independent smart contracts that deposit the delegated AURORA tokens into the Aurora Plus staking service. The objective of splitting the deposits into multiple depositors is to allow deposits from one depositor, keeping the others of them without the redeem penalization.

Three different contracts are needed to be deployed.

- The stAUR fungible token: ERC20, ERC4626.
- The staking manager is the contract than contains all the logic to stake, unstake and the stAUR-AURORA liquidity pool.
- The depositors are separated smart contracts that have the logic to deposit and withdraw from the Aurora plus staking service.

Using the Aurora SDK, after the liquidity pool is developed, the stAUR token could be used directly in Meta Yield.

![Architecture](media/stakingAurora.png)

# Operation

Get a status of the contracts in Aurora `mainnet`.

```sh
npx hardhat run scripts/mainnet/status/view_st_aur_status.js --network aurora_mainnet
```

Run the `Mr Robot` 🤖 operation clean orders.

```sh
npx hardhat run scripts/mainnet/bot/clean_orders.js --network aurora_mainnet
```

# Functions

## Burn 🔥

The `burn()` function allows the redistribution of the underlying asset to all the stAUR holders.

# Deployment in Goerli

First, the contracts will be deployed in ETH Goerli, using the two `testing/` contracts for the Aurora Staking service and the Aurora token.

```sh
Addresses of the deployed contracts:
 - AuroraToken 💚: ----- 0xCca0C26Be4169d7963fEC984F6EAd5F6e630B288
 - CentauriToken 🪐: --- 0x6f2c4ee43D89b904e62f5F0acF68A37100C968D0
 - AuroraStaking: ------ 0x8e6aA7a602042879074334bB6c02c40A9385F522
 - StakingManager: ----- [DEPRECATED] 0xd44b2eC72C39538294d6e2735DcAc7BB5Ebf2cC6
 - Depositor 00: ------- 0xF01d1060Fe27D69D143EB237dbC8235ED3e4FA4f
 - Depositor 01: ------- 0x0C32f3824B02EC9B82598Cfe487162463579242F
 - StakedAuroraVault: -- 0xD6a1BEB40523A91B8424C02517219875A5D95c01
 - LiquidityPool: ------ 0x9156273eE2684BE1C9F1064cCE43f30E766c8496

  # Updated Manager
 - NEW StakingManager: - [DEPRECATED] 0xf8Cb922aBdb0a2d4478ADE41a493d9A11e0e6009
 - NEW StakingManager: - 0x2da4A45AE7f78EABce1E3206c85383E9a98529d2
```

## Install Foundry on top of Hardhat

Source: https://book.getfoundry.sh/getting-started/installation

1. Install the Foundry CLI:

```sh
curl -L https://foundry.paradigm.xyz | bash
```

2. Create a new Foundry project:

```sh

```

3. Deal with the remappings

```sh
forge remappings > remappings.txt
```

```sh
## Running the test in verbose mode.
$ forge test -vvv
[⠆] Compiling...
No files changed, compilation skipped

Running 2 tests for test/foundry/TestStakingPool.sol:TestStakingPool
[PASS] testInflationAttack() (gas: 931329)
Logs:
  [-] Initial balances:
  	- Attacker AUR balance:  200000000000000000000
  	- Attacker stAUR balance:  0
  	- stAUR total supply:  0
  	- Alice AUR balance:  200000000000000000000
  	- Alice stAUR balance:  0

  [*] After ATTACKER's deposit:
  	- Attacker AUR balance:  99999999999999999999
  	- Attacker stAUR balance:  100000000000000000001
  	- stAUR total supply:  100000000000000000001
  	- Alice AUR balance:  200000000000000000000
  	- Alice stAUR balance:  0

  [*] After ATTACKER's inflation:
  	- Attacker AUR balance:  99999999999999999999
  	- Attacker stAUR balance:  1
  	- stAUR total supply:  1
  	- Alice AUR balance:  200000000000000000000
  	- Alice stAUR balance:  0

  [+] Victim deposit tokens:
  	- Attacker AUR balance:  99999999999999999999
  	- Attacker stAUR balance:  1
  	- stAUR total supply:  2
  	- Alice AUR balance:  0
  	- Alice stAUR balance:  1

  [*] After ATTACKER's withdraw:
  	- Attacker AUR balance:  249999999999999999999
  	- Attacker stAUR balance:  0
  	- stAUR total supply:  1
  	- Alice AUR balance:  0
  	- Alice stAUR balance:  1


[PASS] test_NumberIs42() (gas: 2412)
Test result: ok. 2 passed; 0 failed; finished in 2.97ms
```
