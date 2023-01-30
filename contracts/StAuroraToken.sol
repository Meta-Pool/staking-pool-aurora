// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakingManager {
    function totalAssets() external returns (uint256);
}

contract StAuroraToken is ERC4626, Ownable {

    address public stakingManager;

    constructor(address asset_) ERC4626(IERC20(asset_)) {}

    function updataStakingManager(address _stakingManager) public OnlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function totalAssets() public view override returns (uint256) {
        require(managerContract != address(0));
        return IStakingManager(managerContract).totalAssets();
    }
}
