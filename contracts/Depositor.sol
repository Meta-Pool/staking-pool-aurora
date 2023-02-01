// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakingManager {

    function stAurora() external view returns (address);
    function auroraStaking() external view returns (address);
    function auroraToken() external view returns (address);

}

interface IAuroraStaking {
    function stake(uint256 amount) external;
}

contract Depositor is Ownable {

    address public stakingManager;
    address immutable public stAurora;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    modifier onlyManager() {
        require(msg.sender == stakingManager);
        _;
    }

    modifier onlyStAurora() {
        require(msg.sender == stAurora);
        _;
    }

    constructor(address _stakingManager) {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;

        IStakingManager manager = IStakingManager(stakingManager);
        stAurora = manager.stAurora();
        auroraToken = manager.auroraToken();
        auroraStaking = manager.auroraStaking();
    }

    function updataStakingManager(address _stakingManager) public onlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function stake(uint256 _assets) public onlyStAurora {
        SafeERC20.safeTransferFrom(
            IERC20(auroraToken),
            stAurora,
            address(this),
            _assets
        );
    }
}
