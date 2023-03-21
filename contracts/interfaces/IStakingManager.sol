// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IStakingManager {
    function stAurora() external view returns (address);
    function auroraStaking() external view returns (address);
    function auroraToken() external view returns (address);
    function totalAssets() external view returns (uint256);
}