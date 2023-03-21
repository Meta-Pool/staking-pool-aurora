// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IDepositor {
    function getPending(address _account)
        external
        view
        returns (uint256);
    function stake(uint256 _assets) external;
    function unstake(uint256 _assets) external;
    function unstakeAll() external;
    function withdraw(uint _assets) external;
}