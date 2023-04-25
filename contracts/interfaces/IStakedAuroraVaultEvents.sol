// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IStakedAuroraVaultEvents {
    event AccountBlacklisted(address indexed _account, address _sender);
    event AccountWhitelisted(address indexed _account, address _sender);
    event ContractInitialized(address _stakingManager, address _liquidityPool, address _sender);
    event ContractUpdateOperation(bool _isFullyOperational, address _sender);
    event ContractUpdateWhitelist(bool _isWhitelistRequired, address _sender);
    event NewLiquidityPoolUpdate(address _new, address _sender);
    event NewManagerUpdate(address _new, address _sender);
    event WithdrawOrderCreated(address indexed _caller, address indexed _receiver, address indexed _owner, uint256 _shares, uint256 _assets);
    event UpdateMinDepositAmount(uint256 _new, address _sender);
}