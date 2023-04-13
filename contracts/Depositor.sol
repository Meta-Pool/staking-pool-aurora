// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IAuroraStaking.sol";
import "./interfaces/IStakingManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Depositor is Ownable {
    using SafeERC20 for IERC20;

    address public stakingManager;
    address immutable public stAurVault;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    // TODO: Eventos!!!

    modifier onlyManager() {
        require(msg.sender == stakingManager, "ONLY_FOR_STAUR_MANAGER");
        _;
    }

    modifier onlyStAurVault() {
        require(msg.sender == stAurVault, "ONLY_FOR_STAUR_VAULT");
        _;
    }

    constructor(address _stakingManager) {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        stakingManager = _stakingManager;

        IStakingManager manager = IStakingManager(_stakingManager);
        stAurVault = manager.stAurVault();
        auroraToken = manager.auroraToken();
        auroraStaking = manager.auroraStaking();
    }

    function updateStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        stakingManager = _stakingManager;
    }

    function stake(uint256 _assets) external onlyStAurVault {
        IERC20 aurora = IERC20(auroraToken);
        aurora.safeTransferFrom(stAurVault, address(this), _assets);
        aurora.safeIncreaseAllowance(auroraStaking, _assets);
        IAuroraStaking(auroraStaking).stake(_assets);
    }

    function unstake(uint256 _assets) external onlyManager {
        IAuroraStaking(auroraStaking).unstake(_assets);
    }

    function unstakeAll() external onlyManager {
        IAuroraStaking(auroraStaking).unstakeAll();
    }

    function withdraw(uint256 _assets) external onlyManager {
        IAuroraStaking(auroraStaking).withdraw(0);
        IERC20(auroraToken).safeTransfer(stakingManager, _assets);
    }

    function getPending(
        address _account
    ) external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getPending(0, _account);
    }

    // TODO ⛔ The next 2 functions are not testest.
    function collectStreamReward(uint256 _streamId) public {
        IAuroraStaking(auroraStaking).moveRewardsToPending(_streamId);
    }

    // TODO: send to owner.
    function withdrawRewards(uint256 _streamId) public onlyManager {
        IAuroraStaking(auroraStaking).withdraw(_streamId);
    }
}