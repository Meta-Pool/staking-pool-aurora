
require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      // forking: {
      //   url: `https://aurora-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      //   blockNumber: Number(process.env.BLOCK_NUMBER),
      //   enabled: true,
      // },
    },
    goerli_alchemy: {
      allowUnlimitedContractSize: true,
      gas: 5000000,
      gasLimit: 5000000,
      maxFeePerGas: 55000000000,
      maxPriorityFeePerGas: 55000000000,
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [
        process.env.ALICE_PRIVATE_KEY,
        process.env.BOB_PRIVATE_KEY,
        process.env.CARL_PRIVATE_KEY
      ]
    },
    goerli: {
      allowUnlimitedContractSize: true,
      gas: 5000000,
      gasLimit: 5000000,
      maxFeePerGas: 55000000000,
      maxPriorityFeePerGas: 55000000000,
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        process.env.ALICE_PRIVATE_KEY,
        process.env.BOB_PRIVATE_KEY,
        process.env.CARL_PRIVATE_KEY
      ]
    },
    aurora_mainnet: {
      url: `https://aurora-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        process.env.ADMIN_PRIVATE_KEY,
        process.env.OPERATOR_PRIVATE_KEY,
        process.env.LP_FEE_COLLECTOR_PRIVATE_KEY,
        process.env.DEPOSITOR_FEE_COLLECTOR_PRIVATE_KEY
      ]
    },
    aurora_testnet: {
      url: `https://aurora-testnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        process.env.ALICE_PRIVATE_KEY,
        process.env.BOB_PRIVATE_KEY,
        process.env.CARL_PRIVATE_KEY
      ]
    },
  }
};
