// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IDepositor {
    // TODO: example events. delete them after use.
    // event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);

    // event Withdraw(
    //     address indexed sender,
    //     address indexed receiver,
    //     address indexed owner,
    //     uint256 assets,
    //     uint256 shares
    // );


    event NewManager(address indexed _sender, address _old, address _new);

    function getPendingAurora() external view returns (uint256);
    function getPendingRewards(uint256 _streamId) external view returns (uint256);
    function moveRewardsToPending(uint256 _streamId) external;
    function stake(uint256 _assets) external;
    function unstake(uint256 _assets) external;
    function unstakeAll() external;
    function updateStakingManager(address _stakingManager) external;
    function withdraw(uint _assets) external;
    function withdrawRewards(uint256 _streamId, address _spender) external;
}