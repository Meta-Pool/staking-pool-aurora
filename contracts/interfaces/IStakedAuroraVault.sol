// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IStakedAuroraVault {
    function previewWithdraw(uint256 _assets) external view returns (uint256);
    function previewRedeem(uint256 _shares) external view returns (uint256);
    function burn(address _owner, uint256 _shares) external;
    function balanceOf(address _account) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
}