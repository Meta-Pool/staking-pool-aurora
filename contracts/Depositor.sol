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
    function stake(uint256 _amount) external;

    function unstake(uint256 _amount) external;
    function unstakeAll() external;

    function withdraw(uint256 _streamId) external;

    function getPending(uint256 _streamId, address _account)
        external
        view
        returns (uint256);
}

contract Depositor is Ownable {
    using SafeERC20 for IERC20;

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

    function updateStakingManager(address _stakingManager) public onlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function stake(uint256 _assets) public onlyStAurora {
        IERC20 aurora = IERC20(auroraToken);
        aurora.safeTransferFrom(stAurora, address(this), _assets);
        aurora.safeIncreaseAllowance(auroraStaking, _assets);
        IAuroraStaking(auroraStaking).stake(_assets);
    }

    function unstake(uint256 _assets) public onlyManager {
        IAuroraStaking(auroraStaking).unstake(_assets);
    }

    function unstakeAll() public onlyManager {
        IAuroraStaking(auroraStaking).unstakeAll();
    }

    function withdraw(uint256 _assets) public onlyManager {
        IAuroraStaking(auroraStaking).withdraw(0);
        IERC20(auroraToken).safeTransfer(stakingManager, _assets);
    }

    function getPending(address _account)
        external
        view
        returns (uint256)
    {
        return IAuroraStaking(auroraStaking).getPending(0, _account);
    }
}
