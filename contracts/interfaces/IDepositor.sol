// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IDepositor {
    event NewManager(address indexed _sender, address _old, address _new);
    event StakeThroughDepositor(address indexed _depositor, uint256 _assets);
    event UnstakeThroughDepositor(address indexed _depositor, uint256 _assets);
    event UnstakeAllThroughDepositor(address indexed _depositor);
    event WithdrawThroughDepositor(address indexed _depositor, address indexed _manager, uint256 _assets);
    event MoveRewardsToPending(address indexed _depositor, uint256 _streamId);
    event WithdrawRewards(address indexed _depositor, uint256 _streamId, address _spender);

    function getPendingAurora() external view returns (uint256);
    function getPendingRewards(uint256 _streamId) external view returns (uint256);
    function moveRewardsToPending(uint256 _streamId) external;
    function stake(uint256 _assets) external;
    function unstake(uint256 _assets) external;
    function unstakeAll() external;
    function withdraw(uint _assets) external;
    function withdrawRewards(uint256 _streamId, address _spender) external;
}