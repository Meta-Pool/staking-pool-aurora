// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IStakingManager {
    address immutable public stAurora;
    address immutable public auroraStaking;
    address immutable public auroraToken;
}

interface IAuroraStaking {
    function stake(uint256 amount) external;
}


contract Depositor {

    address immutable public stakingManager;

    modifier onlyManager {
        require(msg.sender == stakingManager);
        _;
    }

    constructor(address _stakingManager) {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function stake(uint256 _assets) public onlyManager {
        IStakingManager manager = IStakingManager(stakingManager);
        address _stAurora = manager.stAurora();
        SafeERC20.safeTransferFrom(IERC20(manager.auroraToken()), manager.stAurora(), address(this), _assets);


    }
}
