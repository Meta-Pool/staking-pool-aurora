// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IStakedAuroraVaultEvents {
    event AccountBlacklisted(address indexed _sender, address indexed _account);
    event AccountWhitelisted(address indexed _sender, address indexed _account);
    event ContractInitialized(address indexed _sender, address _stakingManager, address _liquidityPool);
    event ContractUpdateOperation(address indexed _sender, bool _isFullyOperational);
    event ContractUpdateWhitelist(address indexed _sender, bool _isWhitelistRequired);
    event NewLiquidityPoolUpdate(address indexed _sender, address _old, address _new);
    event NewManagerUpdate(address indexed _sender, address _old, address _new);
    event WithdrawOrderCreated(address indexed _sender, address indexed _receiver, address indexed _owner, uint256 _shares, uint256 _assets);
    event UpdateMinDepositAmount(address indexed _sender, uint256 _old, uint256 _new);
}