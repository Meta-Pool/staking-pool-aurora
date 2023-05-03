//////////////////////
// ROBOT 🤖 Config //
//////////////////////

// Goerli test addresses
const STAKED_AURORA_VAULT_ADDRESS = "0xD6a1BEB40523A91B8424C02517219875A5D95c01";
const LIQUIDITY_POOL_ADDRESS = "0x9156273eE2684BE1C9F1064cCE43f30E766c8496";
const STAKING_MANAGER_ADDRESS = "0xf8Cb922aBdb0a2d4478ADE41a493d9A11e0e6009";

const DECIMALS = ethers.BigNumber.from(10).pow(18);

// Accounts
async function generateAccounts() {
  const [ owner, operator ] = await ethers.getSigners();

  // Current Contracts Accounts
  const VAULT_ADMIN_ACCOUNT = owner;
  const MANAGER_ADMIN_ACCOUNT = owner;

  const VAULT_OPERATOR_ACCOUNT = operator;
  const MANAGER_OPERATOR_ACCOUNT = operator;

  const DEPOSITOR_ADMIN_ACCOUNT = operator;

  return {
    VAULT_ADMIN_ACCOUNT,
    MANAGER_ADMIN_ACCOUNT,
    VAULT_OPERATOR_ACCOUNT,
    MANAGER_OPERATOR_ACCOUNT,
    DEPOSITOR_ADMIN_ACCOUNT
  };
}

module.exports = {
  generateAccounts,
  STAKED_AURORA_VAULT_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  STAKING_MANAGER_ADDRESS,
  DECIMALS
};