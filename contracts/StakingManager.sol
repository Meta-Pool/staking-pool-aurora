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

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
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
    /// @dev The Index "0" MUST remain empty of any withdraw order.
    mapping(uint256 => uint256) withdrawOrderAmount;
    mapping(uint256 => address) withdrawOrderReceiver;
    uint256 lastWithdrawOrderIndex;
    uint256 public totalWithdrawInQueue;

    /// @dev The Index "0" MUST remain empty of any withdraw order.
    mapping(uint256 => uint256) pendingOrderAmount;
    mapping(uint256 => address) pendingOrderReceiver;
    uint256 lastPendingOrderIndex;

    mapping(address => uint256) availableAssets;

    /// @dev The depositors and withdrawOrders arrays need to be looped.
    /// @dev We enforce limits to the size of this two arrays.
    uint256 maxWithdrawOrders;
    uint256 maxDepositors;

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

        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(OPERATOR_ROLE, _contractOperator);
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
        require(_maxWithdrawOrders >= lastWithdrawOrderIndex, "BELOW_CURRENT_LENGTH");
        maxWithdrawOrders = _maxWithdrawOrders;
    }

    /// @notice Only in case of emergency 🦺, return all funds to users with a withdraw order.
    /// @notice Users will NOT receive back the exact same amount of shares they had before.
    /// @dev The last inclusive index to process will be (from_index + limit - 1).
    /// @param from_index The inclusive withdraw order index the clear will start (cannot be zero).
    /// @param limit The number of orders to process.
    function emergencyClearWithdrawOrders(
        uint256 from_index,
        uint256 limit
    ) external onlyRole(ADMIN_ROLE) {
        require(from_index > 0, "INVALID_INDEX_ZERO");
        require(limit > 0, "INVALID_LIMIT_ZERO");
        require(
            !IStakedAuroraVault(stAurVault).fullyOperational(),
            "ONLY_WHEN_VAULT_IS_NOT_FULLY_OP"
        );
        for (uint i = from_index; i <= (from_index + limit - 1); i++) {
            uint256 _assets = withdrawOrderAmount[i];
            if (_assets > 0) {
                address _receiver = withdrawOrderReceiver[i];
                // Removing withdraw order.
                withdrawOrderAmount[i] = 0;
                withdrawOrderReceiver[i] = address(0);
                IStakedAuroraVault(stAurVault).emergencyMintRecover(_receiver, _assets);
            }
            totalWithdrawInQueue -= _assets;
        }
        // When all the withdraw orders were cleared, then remove the last order index.
        if (totalWithdrawInQueue == 0) {
            lastWithdrawOrderIndex = 0;
        }
    }

    /// @dev If the user do NOT have a withdraw order, expect an index of "0".
    function _getUserWithdrawOrderIndex(address _account) private view returns (uint256) {
        for (uint i = 1; i <= lastWithdrawOrderIndex; i++) {
            if (withdrawOrderReceiver[i] == _account) {
                return i;
            }
        }
        return 0;
    }

    /// @dev If the user do NOT have a pending order, expect an index of "0".
    function _getUserPendingOrderIndex(address _account) private view returns (uint256) {
        for (uint i = 1; i <= lastPendingOrderIndex; i++) {
            if (pendingOrderReceiver[i] == _account) {
                return i;
            }
        }
        return 0;
    }

    /// @notice Returns the amount of assets of a user in the withdraw orders.
    function getWithdrawOrderAssets(address _account) external view returns (uint256) {
        uint256 index = _getUserWithdrawOrderIndex(_account);
        return withdrawOrderAmount[index];
    }

    function getTotalWithdrawOrders() external view returns (uint256) {
        return lastWithdrawOrderIndex;
    }

    /// @notice Returns the amount of assets of a user in the pending orders.
    function getPendingOrderAssets(address _account) external view returns (uint256) {
        uint256 index = _getUserPendingOrderIndex(_account);
        return pendingOrderAmount[index];
    }

    function getTotalPendingOrders() external view returns (uint256) {
        return lastPendingOrderIndex;
    }

    /// @notice Returns the amount of available assets of a user.
    function getAvailableAssets(address _account) external view returns (uint256) {
        return availableAssets[_account];
    }

    function depositorsLength() external view returns (uint256) {
        return depositors.length;
    }

    function getDepositorShares(address _depositor) external view returns (uint256) {
        return depositorShares[_depositor];
    }

    function depositorExists(address _depositor) external view returns (bool) {
        for (uint i = 0; i < depositors.length; i++) {
            if (depositors[i] == _depositor) {
                return true;
            }
        }
        return false;
    }

    function _updateDepositorShares(address _depositor) private {
        depositorShares[_depositor] = IAuroraStaking(auroraStaking).getUserShares(_depositor);
    }

    /// @dev The next depositor will always be the one with LESS shares.
    /// @dev For tiebreaking use the one with lower index.
    function setNextDepositor() external onlyStAurVault {
        _updateDepositorShares(nextDepositor);
        address _nextDepositor = depositors[0];
        for (uint i = 0; i < depositors.length; i++) {
            // Keeping a < instead of <= allows prioritizing the deposits in lower index depositors.
            if (depositorShares[depositors[i]] < depositorShares[_nextDepositor] ) {
                _nextDepositor = depositors[i];
            }
        }
        nextDepositor = _nextDepositor;
    }

    function getTotalAssetsFromDepositor(
        address _depositor
    ) public view returns (uint256) {
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

    function transferAurora(
        address _receiver,
        address _owner,
        uint256 _assets
    ) external onlyStAurVault {
        require(availableAssets[_owner] >= _assets, "NOT_ENOUGH_AVAILABLE_ASSETS");
        availableAssets[_owner] -= _assets;
        IERC20 token = IERC20(auroraToken);
        token.safeTransfer(_receiver, _assets);
    }

    /// Unstaking Flow - Ran by ROBOT 🤖
    /// 1. Withdraw pending Aurora from depositors.
    /// 2. Move previous pending amount to Available.
    /// 3. Unstake withdraw orders.
    /// 4. Move withdraw orders to Pending.
    /// 5. Remove withdraw orders.
    function cleanOrdersQueue() public {
        require(depositors.length > 0, "CREATE_DEPOSITOR");
        require(nextCleanOrderQueue <= block.timestamp, "WAIT_FOR_NEXT_CLEAN_ORDER");

        _withdrawFromDepositor();       // Step 1.
        _movePendingToAvailable();      // Step 2.
        _unstakeWithdrawOrders();       // Step 3.
        _moveAndRemoveWithdrawOrders(); // Step 4 & 5.

        // Update the timestamp for the next clean and total.
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

    /// @dev The require is done after trying to increase the order amount.
    function _createWithdrawOrder(
        uint256 _assets,
        address _receiver
    ) private {
        totalWithdrawInQueue += _assets;
        uint256 index = _getUserWithdrawOrderIndex(_receiver);
        // Create a new withdraw order.
        if (index == 0) {
            require(lastWithdrawOrderIndex < maxWithdrawOrders, "TOO_MANY_WITHDRAW_ORDERS");
            lastWithdrawOrderIndex++;
            withdrawOrderAmount[lastWithdrawOrderIndex] = _assets;
            withdrawOrderReceiver[lastWithdrawOrderIndex] = _receiver;
        // Increase current withdraw order.
        } else {
            withdrawOrderAmount[index] += _assets;
        }
    }

    function _withdrawFromDepositor() private {
        for (uint i = 0; i < depositors.length; i++) {
            address depositor = depositors[i];
            uint256 pendingAmount = IDepositor(depositor).getPendingAurora();
            if (pendingAmount > 0) {
                IDepositor(depositor).withdraw(pendingAmount);
            }
        }
    }

    function _movePendingToAvailable() private {
        for (uint i = 1; i <= lastPendingOrderIndex; i++) {
            address _receiver = pendingOrderReceiver[i];
            uint256 _amount = pendingOrderAmount[i];
            pendingOrderAmount[i] = 0;
            pendingOrderReceiver[i] = address(0);
            availableAssets[_receiver] += _amount;
        }
        lastPendingOrderIndex = 0;
    }

    function _unstakeWithdrawOrders() private {
        uint256 alreadyWithdraw = 0;
        if (totalWithdrawInQueue > 0) {
            for (uint i = depositors.length; i > 0; i--) {
                address depositor = depositors[i-1];
                uint256 assets = getTotalAssetsFromDepositor(depositor);
                if (assets == 0) continue;
                uint256 nextWithdraw = totalWithdrawInQueue - alreadyWithdraw;

                if (assets >= nextWithdraw) {
                    IDepositor(depositor).unstake(nextWithdraw);
                    alreadyWithdraw += nextWithdraw;
                } else {
                    IDepositor(depositor).unstakeAll();
                    alreadyWithdraw += assets;
                }
                _updateDepositorShares(depositor);
                if (alreadyWithdraw == totalWithdrawInQueue) return;
            }
        }
    }

    function _moveAndRemoveWithdrawOrders() private {
        for (uint i = 1; i <= lastWithdrawOrderIndex; i++) {
            uint256 _assets = withdrawOrderAmount[i];
            if (_assets > 0) {
                address _receiver = withdrawOrderReceiver[i];
                // Removing withdraw order.
                withdrawOrderAmount[i] = 0;
                withdrawOrderReceiver[i] = address(0);

                // Creating pending order.
                pendingOrderAmount[i] = _assets;
                pendingOrderReceiver[i] = _receiver;
            }
        }
        lastPendingOrderIndex = lastWithdrawOrderIndex;
        lastWithdrawOrderIndex = 0;        
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