// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakedAuroraVault is IERC20 {
    function balanceOf(address _account) external view returns (uint256);
    function convertToAssets(uint256 _shares) external view returns (uint256 _assets);
    function emergencyMintRecover(address _receiver, uint256 _assets) external;
    function fullyOperational() external view returns (bool);
    function previewRedeem(uint256 _shares) external view returns (uint256);
    function previewWithdraw(uint256 _assets) external view returns (uint256);
}