// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IStakedAuroraVault is IERC4626 {
    function balanceOf(address _account) external view returns (uint256);
    function convertToAssets(uint256 _shares) external view returns (uint256 _assets);
    function fullyOperational() external view returns (bool);
    function mintFee(address _treasury, uint256 _fee) external;
    function previewRedeem(uint256 _shares) external view returns (uint256);
    function previewWithdraw(uint256 _assets) external view returns (uint256);
    function stakingManager() external view returns (address);
}