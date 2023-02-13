// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

interface IStakingManager {

    function stAurora() external view returns (address);
    function auroraStaking() external view returns (address);
    function auroraToken() external view returns (address);

}

interface IAuroraStaking {
    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;
    function unstakeAll() external;

    function withdraw(uint256 streamId) external;

    function getPending(uint256 streamId, address account)
        external
        view
        returns (uint256);
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
        IERC20 aurora = IERC20(auroraToken);
        SafeERC20.safeTransferFrom(aurora, stAurora, address(this), _assets);
        SafeERC20.safeIncreaseAllowance(aurora, auroraStaking, _assets);
        IAuroraStaking(auroraStaking).stake(_assets);
    }

    function unstake(uint256 _assets) public onlyManager {
        IAuroraStaking(auroraStaking).unstake(_assets);
    }

    function unstakeAll() public onlyManager {
        IAuroraStaking(auroraStaking).unstakeAll();
    }

    function withdraw() public onlyManager {
        IAuroraStaking(auroraStaking).withdraw(0);
    }

    function getPending(address account)
        external
        view
        returns (uint256)
    {
        return IAuroraStaking(auroraStaking).getPending(0, account);
    }
}
