// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IAuroraStaking.sol";
import "./interfaces/IDepositor.sol";
import "./interfaces/IStakingManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Depositor is Ownable, IDepositor {
    using SafeERC20 for IERC20;

    address public stakingManager;
    address immutable public stAurVault;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    // TODO: Eventos!!! Revisar si conviene duplicar eventos o no?
    // xq los eventos de stake y unstake ya los ejecuta la vault.

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
        emit NewManager(_msgSender(), stakingManager, _stakingManager);
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

    function getPendingAurora() external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getPending(0, address(this));
    }

    /// Reward functions, for streamId greater than 0.

    function getPendingRewards(uint256 _streamId) external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getPending(_streamId, address(this));
    }

    // TODO ⛔ The next 2 functions are not testest.
    function collectStreamReward(uint256 _streamId) external onlyOwner {
        IAuroraStaking(auroraStaking).moveRewardsToPending(_streamId);
    }

    function withdrawRewards(
        uint256 _streamId,
        address _spender
    ) external onlyOwner {
        require(_streamId > 0, "WITHDRAW_ONLY_FOR_REWARDS");
        (,address rewardToken,,,,,,,,,) = IAuroraStaking(auroraStaking).getStream(_streamId);
        IAuroraStaking staking = IAuroraStaking(auroraStaking);
        uint256 _amount = staking.getPending(_streamId, address(this));
        if (_amount > 0) {
            staking.withdraw(_streamId);
            IERC20(rewardToken).safeIncreaseAllowance(_spender, _amount);
        }
    }
}