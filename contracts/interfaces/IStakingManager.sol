// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IStakingManager {
    event CleanOrdersQueue(address indexed _sender, uint256 _auroraStreamTau, uint256 _nextCleanTimestamp);
    event MaxDepositorsUpdate(address indexed _sender, uint256 _maxDepositors);
    event MaxWithdrawOrdersUpdate(address indexed _sender, uint256 _maxWithdrawOrders);
    event NewDepositorAdded(address indexed _sender, address _depositor);
    event UpdateProcessWithdrawOrders(address indexed _sender, bool _isProcessStopped);
    event AltWithdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets);

    function alternativeWithdraw(uint256 _assets, address _receiver) external;
    function auroraStaking() external view returns (address);
    function auroraToken() external view returns (address);
    function changeMaxDepositors(uint256 _maxDepositors) external;
    function changeMaxWithdrawOrders(uint256 _maxWithdrawOrders) external;
    function cleanOrdersQueue() external;
    function createWithdrawOrder(uint256 _assets, address _receiver) external;
    function depositorExists(address _depositor) external view returns (bool);
    function depositorsLength() external view returns (uint256);
    function getAvailableAssets(address _account) external view returns (uint256);
    function getDepositorShares(address _depositor) external view returns (uint256);
    function getPendingOrderAssets(address _account) external view returns (uint256);
    function getTotalAssetsFromDepositor(address _depositor) external view returns (uint256);
    function getTotalAssetsFromDepositors() external view returns (uint256);
    function getTotalPendingOrders() external view returns (uint256);
    function getTotalWithdrawOrders() external view returns (uint256);
    function getWithdrawOrderAssets(address _account) external view returns (uint256);
    function insertDepositor(address _depositor) external;
    function nextDepositor() external view returns (address);
    function setNextDepositor() external;
    function stAurVault() external view returns (address);
    function totalAssets() external view returns (uint256);
    function transferAurora(address _receiver, address _owner, uint256 _assets) external;
}