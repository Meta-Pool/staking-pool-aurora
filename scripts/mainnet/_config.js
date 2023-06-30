/////////////////////////////
// Global stAUR 🪐 Config //
/////////////////////////////

const DECIMALS = ethers.BigNumber.from(10).pow(18);

// AURORA Mainnet addresses
const AURORA_PLUS_ADDRESS = "0xccc2b1aD21666A5847A804a73a41F904C4a4A0Ec";
const AURORA_TOKEN_ADDRESS = "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79";
const DEPOSITOR_00_ADDRESS = "0x158eFd7b742ac77922F6dcC5CA6e0dFD0c375eeC";
const DEPOSITOR_01_ADDRESS = "0x1CC2f3A24F5c826af7F98A91b98BeC2C05115d01";
const LIQUIDITY_POOL_ADDRESS = "0x98d45f7D4FcF992cb62fb439A889320400186AE0";
const STAKED_AURORA_VAULT_ADDRESS = "0x8A7feB26ee5b202804AC11Dd5a739A945C5De11d";
const STAKING_MANAGER_ADDRESS = "0xfbC1423a2A4453E162cDd535991bCC4143E5d336";

const DEPOSITORS_ADDRESS = [ DEPOSITOR_00_ADDRESS, DEPOSITOR_01_ADDRESS ];

// Accounts
async function generateAccounts() {
  const [
    admin,
    operator,
    treasury,
    depositorFeeCollector
  ] = await ethers.getSigners();

  // Current Contracts Accounts
  const VAULT_ADMIN_ACCOUNT = admin;
  const MANAGER_ADMIN_ACCOUNT = admin;
  const LIQ_POOL_ADMIN_ACCOUNT = admin;
  const DEPOSITOR_ADMIN_ACCOUNT = admin;

  const VAULT_OPERATOR_ACCOUNT = operator;
  const MANAGER_OPERATOR_ACCOUNT = operator;

  const TREASURY_ACCOUNT = treasury;
  const DEPOSITOR_FEE_COLLECTOR_ACCOUNT = depositorFeeCollector;

  return {
    DEPOSITOR_ADMIN_ACCOUNT,
    DEPOSITOR_FEE_COLLECTOR_ACCOUNT,
    LIQ_POOL_ADMIN_ACCOUNT,
    TREASURY_ACCOUNT,
    MANAGER_ADMIN_ACCOUNT,
    MANAGER_OPERATOR_ACCOUNT,
    VAULT_ADMIN_ACCOUNT,
    VAULT_OPERATOR_ACCOUNT
  };
}

module.exports = {
  generateAccounts,
  AURORA_PLUS_ADDRESS,
  AURORA_TOKEN_ADDRESS,
  DECIMALS,
  DEPOSITORS_ADDRESS,
  DEPOSITOR_00_ADDRESS,
  DEPOSITOR_01_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  STAKED_AURORA_VAULT_ADDRESS,
  STAKING_MANAGER_ADDRESS
};