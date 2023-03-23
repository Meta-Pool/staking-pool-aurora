// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ILiquidityPool {
    function getAuroraFromVault(uint256 _assets) external;
    function transferStAur(address _receiver, uint256 _amount) external returns (bool);
}