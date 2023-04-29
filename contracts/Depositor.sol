// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IAuroraStaking.sol";
import "./interfaces/IDepositor.sol";
import "./interfaces/IStakingManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice In case of emergency, keep the Depositors alive and update the Staking Manager logic.

contract Depositor is AccessControl, IDepositor {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COLLECT_REWARDS_ROLE = keccak256("COLLECT_REWARDS_ROLE");

    address public stakingManager;
    address immutable public stAurVault;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    modifier onlyManager() {
        require(msg.sender == stakingManager, "ONLY_FOR_STAUR_MANAGER");
        _;
    }

    modifier onlyStAurVault() {
        require(msg.sender == stAurVault, "ONLY_FOR_STAUR_VAULT");
        _;
    }

    constructor(
        address _stakingManager,
        address _collectRewardsRole
    ) {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        stakingManager = _stakingManager;

        IStakingManager manager = IStakingManager(_stakingManager);
        stAurVault = manager.stAurVault();
        auroraToken = manager.auroraToken();
        auroraStaking = manager.auroraStaking();

        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(COLLECT_REWARDS_ROLE, _collectRewardsRole);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    receive() external payable {}

    /// @dev In case of emergency 🛟, update the Manager contract.
    function updateStakingManager(
        address _stakingManager
    ) external onlyRole(ADMIN_ROLE) {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        stakingManager = _stakingManager;

        emit NewManagerUpdate(_stakingManager, msg.sender);
    }

    /// @notice The staking has to go first through the stAUR vault.
    function stake(uint256 _assets) external onlyStAurVault {
        IERC20 aurora = IERC20(auroraToken);
        address _auroraStaking = auroraStaking;
        aurora.safeTransferFrom(stAurVault, address(this), _assets);
        aurora.safeIncreaseAllowance(_auroraStaking, _assets);
        IAuroraStaking(_auroraStaking).stake(_assets);

        emit StakeThroughDepositor(address(this), _assets);
    }

    /// @notice The unstake is made by the Robot 🤖 clean-order job.
    function unstake(uint256 _assets) external onlyManager {
        IAuroraStaking(auroraStaking).unstake(_assets);

        emit UnstakeThroughDepositor(address(this), _assets);
    }

    /// @notice The unstake is made by the Robot 🤖 clean-order job.
    function unstakeAll() external onlyManager {
        IAuroraStaking(auroraStaking).unstakeAll();

        emit UnstakeAllThroughDepositor(address(this));
    }

    /// @notice Withdraw transfers AURORA tokens to the Manager. The withdraw
    /// is made by the Robot 🤖 clean-order job.
    /// @dev The param of 0 in withdraw refers to the streamId for the Aurora Token.
    function withdraw(uint256 _assets) external onlyManager {
        IAuroraStaking(auroraStaking).withdraw(0);
        address _stakingManager = stakingManager;
        IERC20(auroraToken).safeTransfer(_stakingManager, _assets);

        emit WithdrawThroughDepositor(address(this), _stakingManager, _assets);
    }

    /// @notice Interface for the Aurora Staking (Aurora Plus) contract.
    function getReleaseTime(uint256 _streamId) external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getReleaseTime(_streamId, address(this));
    }

    /// @notice Interface for the Aurora Staking (Aurora Plus) contract.
    /// @dev The param of 0 in getPendings refers to the streamId for the Aurora Token.
    function getPendingAurora() external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getPending(0, address(this));
    }

    /// @notice Interface for the Aurora Staking (Aurora Plus) contract.
    function getPendingRewards(uint256 _streamId) external view returns (uint256) {
        return IAuroraStaking(auroraStaking).getPending(_streamId, address(this));
    }

    /// @notice Manually collect depositor Stream Rewards from Aurora Plus.
    function moveRewardsToPending(
        uint256 _streamId
    ) external onlyRole(COLLECT_REWARDS_ROLE) {
        IAuroraStaking(auroraStaking).moveRewardsToPending(_streamId);

        emit MoveRewardsToPending(address(this), _streamId);
    }

    /// @notice Manually withdraw depositor Stream Rewards from Aurora Plus.
    function withdrawRewards(
        uint256 _streamId,
        address _spender
    ) external onlyRole(COLLECT_REWARDS_ROLE) {
        require(_streamId > 0, "WITHDRAW_ONLY_FOR_REWARDS");
        IAuroraStaking staking = IAuroraStaking(auroraStaking);
        (,address rewardToken,,,,,,,,,) = staking.getStream(_streamId);
        uint256 _amount = staking.getPending(_streamId, address(this));
        if (_amount > 0) {
            staking.withdraw(_streamId);
            IERC20(rewardToken).safeIncreaseAllowance(_spender, _amount);

            emit WithdrawRewards(address(this), _streamId, _spender);
        }
    }
}