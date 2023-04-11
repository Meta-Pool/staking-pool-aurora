// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IAuroraStaking.sol";
import "./interfaces/IDepositor.sol";
import "./interfaces/IStakedAuroraVault.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import "hardhat/console.sol";

/// @notice Staking Manager Logic 🤖:
/// Deposits will always go to the depositor with LESS staked amount.
/// Withdraws will always be taken from the depositor with the greatest index.

contract StakingManager is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DEPOSITORS_OWNER_ROLE = keccak256("DEPOSITORS_OWNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address immutable public stAurVault;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    /// @dev Timestamp that allows the clean-orders process to run.
    uint256 public nextCleanOrderQueue;

    address[] public depositors;
    address public nextDepositor;
    mapping(address => uint256) depositorShares;

    /// @dev For the withdraw process, the assets follow this path:
    /// @dev WithdrawOrder -> PendingOrders -> AvailableAssets
    withdrawOrder[] withdrawOrders;
    withdrawOrder[] pendingOrders;
    mapping(address => uint256) availableAssets;

    /// @dev The depositors and withdrawOrders arrays need to be looped.
    /// @dev We enforce limits to the size of this two arrays.
    uint256 maxWithdrawOrders;
    uint256 maxDepositors;

    uint256 totalWithdrawInQueue;

    struct withdrawOrder {
        uint256 assets;
        address receiver;
    }

    modifier onlyStAurVault() {
        require(msg.sender == stAurVault, "ONLY_FOR_STAUR_VAULT");
        _;
    }

    constructor(
        address _stAurVault,
        address _auroraStaking,
        address _depositorOwner,
        address _contractOperator,
        uint256 _maxWithdrawOrders,
        uint256 _maxDepositors
    ) {
        require(
            _stAurVault != address(0)
                && _auroraStaking != address(0)
                && _depositorOwner != address(0)
                && _contractOperator != address(0),
            "INVALID_ZERO_ADDRESS"
        );
        stAurVault = _stAurVault;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(_stAurVault).asset();
        maxWithdrawOrders = _maxWithdrawOrders;
        maxDepositors = _maxDepositors;
        nextCleanOrderQueue = block.timestamp;

        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(OPERATOR_ROLE, _contractOperator);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function insertDepositor(
        address _depositor
    ) external onlyRole(DEPOSITORS_OWNER_ROLE) {
        require(depositors.length < maxDepositors, "DEPOSITORS_LIMIT_REACHED");
        depositors.push(_depositor);
        nextDepositor = _depositor;
    }

    function changeMaxDepositors(
        uint256 _maxDepositors
    ) external onlyRole(OPERATOR_ROLE) {
        require(_maxDepositors != maxDepositors, "INVALID_CHANGE");
        require(_maxDepositors >= depositors.length, "BELOW_CURRENT_LENGTH");
        maxDepositors = _maxDepositors;
    }

    function changeMaxWithdrawOrders(
        uint256 _maxWithdrawOrders
    ) external onlyRole(OPERATOR_ROLE) {
        require(_maxWithdrawOrders != maxWithdrawOrders, "INVALID_CHANGE");
        require(_maxWithdrawOrders >= withdrawOrders.length, "BELOW_CURRENT_LENGTH");
        maxWithdrawOrders = _maxWithdrawOrders;
    }

    /// @notice Only in case of emergency 🦺, return all funds to users with a withdraw order.
    /// @notice Users will not receive back the exact same amount of shares they had before.
    function emergencyClearWithdrawOrders() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            !IStakedAuroraVault(stAurVault).fullyOperational(),
            "ONLY_WHEN_VAULT_IS_NOT_FULLY_OP"
        );
        for (uint i = 0; i < withdrawOrders.length; i++) {
            IStakedAuroraVault(stAurVault).emergencyMintRecover(
                withdrawOrders[i].receiver,
                withdrawOrders[i].assets
            );
        }
        delete withdrawOrders;
        totalWithdrawInQueue = 0;
    }

    function getWithdrawOrderAssets(address _account) public view returns (uint256) {
        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == _account) {
                return withdrawOrders[i].assets;
            }
        }
        return 0;
    }

    function getTotalWithdrawOrders() public view returns (uint256) {
        return withdrawOrders.length;
    }

    function getPendingOrderAssets(address _account) public view returns (uint256) {
        for (uint i = 0; i < pendingOrders.length; i++) {
            if (pendingOrders[i].receiver == _account) {
                return pendingOrders[i].assets;
            }
        }
        return 0;
    }

    function getAvailableAssets(address _account) public view returns (uint256) {
        return availableAssets[_account];
    }

    function isAdmin(address _address) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _address);
    }

    function isDepositorsOwner(address _address) public view returns (bool) {
        return hasRole(DEPOSITORS_OWNER_ROLE, _address);
    }

    function depositorsLength() external view returns (uint256) {
        return depositors.length;
    }

    function getDepositorShares(address _depositor) external view returns (uint256) {
        return depositorShares[_depositor];
    }

    function depositorExists(address _depositor) public view returns (bool) {
        for (uint i = 0; i < depositors.length; i++) {
            if (depositors[i] == _depositor) {
                return true;
            }
        }
        return false;
    }

    function updateDepositorShares(address _depositor) public {
        require(depositorExists(_depositor), "UNEXISTING_DEPOSITOR");
        depositorShares[_depositor] = IAuroraStaking(auroraStaking).getUserShares(_depositor);
    }

    function setNextDepositor() external onlyStAurVault {
        updateDepositorShares(nextDepositor);
        address _nextDepositor = depositors[0];
        for (uint i = 0; i < depositors.length; i++) {
            // Keeping a < instead of <= allows prioritizing the deposits in lower index depositors.
            if (depositorShares[depositors[i]] < depositorShares[_nextDepositor] ) {
                _nextDepositor = depositors[i];
            }
        }
        nextDepositor = _nextDepositor;
    }

    function getTotalAssetsFromDepositor(address _depositor) public view returns (uint256) {
        uint256 depositorAuroraShares = depositorShares[_depositor];
        if (depositorAuroraShares == 0) return 0;
        return _calculateStakeValue(depositorAuroraShares);
    }

    function getTotalAssetsFromDepositors() public view returns (uint256) {
        uint256 depositorsAuroraShares = 0;
        for (uint i = 0; i < depositors.length; i++) {
            depositorsAuroraShares += depositorShares[depositors[i]];
        }
        if (depositorsAuroraShares == 0) return 0;
        return _calculateStakeValue(depositorsAuroraShares);
    }

    function totalAssets() external view returns (uint256) {
        return getTotalAssetsFromDepositors() - totalWithdrawInQueue;
    }

    function isAvailableToWithdraw(
        uint256 _assets,
        address _owner
    ) public view returns (bool) {
        return availableAssets[_owner] >= _assets;
    }

    function transferAurora(
        address _receiver,
        address _owner,
        uint256 _assets
    ) external onlyStAurVault {
        require(isAvailableToWithdraw(_assets, _owner), "NOT_ENOUGH_AVAILABLE_ASSETS");
        availableAssets[_owner] -= _assets;
        IERC20 token = IERC20(auroraToken);
        token.safeTransfer(_receiver, _assets);
    }

    function getTotalWithdrawInQueue() public view returns (uint256) {
        return totalWithdrawInQueue;
    }

    /// Unstaking Flow - Ran by ROBOT 🤖
    /// 1. Withdraw pending Aurora from depositors.
    /// 2. Move previous pending amount to Available.
    /// 3. Unstake withdraw orders.
    /// 4. Move withdraw orders to Pending.
    /// 5. Remove withdraw orders.
    function cleanOrdersQueue() public {
        require(depositors.length > 0);
        require(nextCleanOrderQueue <= block.timestamp, "WAIT_FOR_NEXT_CLEAN_ORDER");

        _withdrawFromDepositor();   // Step 1.
        _movePendingToAvailable();  // Step 2.
        _unstakeWithdrawOrders();   // Step 3.

        // Step 4 & 5.
        pendingOrders = withdrawOrders; // Warning ⚠️ - Array is copied.
        delete withdrawOrders;

        // Update the timestamp and totals.
        (,,,,,,,,,uint256 tau,) = IAuroraStaking(auroraStaking).getStream(0);
        nextCleanOrderQueue = block.timestamp + tau;
        totalWithdrawInQueue = 0;
    }

    function createWithdrawOrder(
        uint256 _assets,
        address _receiver
    ) external onlyStAurVault {
        _createWithdrawOrder(_assets, _receiver);
    }

    function _createWithdrawOrder(uint256 _assets, address _receiver) private {
        require(withdrawOrders.length < maxWithdrawOrders, "TOO_MANY_WITHDRAW_ORDERS");
        totalWithdrawInQueue += _assets;

        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == _receiver) {
                withdrawOrder storage oldOrder = withdrawOrders[i];
                oldOrder.assets += _assets;
                return;
            }
        }
        withdrawOrders.push(withdrawOrder(_assets, _receiver));
    }

    function _withdrawFromDepositor() private {
        for (uint i = 0; i < depositors.length; i++) {
            address depositor = depositors[i];
            uint256 pendingAmount = IDepositor(depositor).getPending(depositors[i]);
            if (pendingAmount > 0) {
                IDepositor(depositor).withdraw(pendingAmount);
            }
        }
    }

    function _movePendingToAvailable() private {
        for (uint i = 0; i < pendingOrders.length; i++) {
            withdrawOrder memory order = pendingOrders[i];
            availableAssets[order.receiver] += order.assets;
        }
        delete pendingOrders;
    }

    function _unstakeWithdrawOrders() private {
        uint256 totalWithdraw = getTotalWithdrawInQueue();
        uint256 alreadyWithdraw = 0;

        // CAUTION ⛔ keep an eye on this logic.
        if (totalWithdraw > 0) {
            for (uint i = depositors.length; i > 0; i--) {
                address depositor = depositors[i-1];
                uint256 assets = getTotalAssetsFromDepositor(depositor);
                if (assets == 0) continue;
                uint256 nextWithdraw = totalWithdraw - alreadyWithdraw;

                if (assets >= nextWithdraw) {
                    IDepositor(depositor).unstake(nextWithdraw);
                    alreadyWithdraw += nextWithdraw;
                } else {
                    IDepositor(depositor).unstakeAll();
                    alreadyWithdraw += assets;
                }
                updateDepositorShares(depositor);
                if (alreadyWithdraw == totalWithdraw) return;
            }
        }
    }

    function _calculateStakeValue(uint256 _shares) private view returns (uint256) {
        IAuroraStaking aurora = IAuroraStaking(auroraStaking);
        uint256 denominator = aurora.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = _shares * aurora.getTotalAmountOfStakedAurora();
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }
}