// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IAuroraStaking.sol";
import "./interfaces/IDepositor.sol";
import "./interfaces/IStakedAuroraVault.sol";
import "./interfaces/IStakingManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Staking Manager Logic 🤖:
/// Deposits will always go to the depositor with LESS staked amount.
/// Withdraws will always be taken from the depositor with the greatest index.

/// **Security Considerations**:
/// - The StakedAuroraVault contract manage the ledger of the stAUR token. The logic
///   should never be upgraded.
/// - The Depositor(s) contract have the control of all the AURORA tokens. The logic
///   should never be upgraded.
/// - The StakingManager contract manage most of the logic for the "Liquid Staking Protocol".
///   This contract only briefly holds the AURORA tokens that were withdraw using an Order.
///   So, in case of an emergency, the logic of this contract can be updated, deploying a NEW
///   contract Manager, leaving the stAUR ledger and the AURORA tokens safely.

/// **Steps in case of Emergency** 🛟:
/// 1. Keep calm.
/// 2. Pause all deposits and redeems from the StakedAuroraVault contract.
///    StakedAuroraVault.updateContractOperation(false)
/// 3. Keep running the cleanOrdersQueue fn until all orders (withdraw, pending) are processed
///    and available. If there is an issue, you could relief the load of the 🤖 by stop
///    the processing of the Withdraw orders. This will allow the process the pending orders,
///    and when those are available, then process the rest.
/// 4. Deploy a new Manager and update the address in the Vault and in Depositors.
/// 5. Pending tokens could be removed from the old Manager with the alternativeWithdraw.

contract StakingManager is AccessControl, IStakingManager {
    using SafeERC20 for IERC20;

    ///@dev If there are problems with the clean-orders,
    /// you can temporally stop processing withdraw orders.
    bool stopWithdrawOrders;

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

    struct Order {
        uint256 amount;
        address receiver;
    }

    /// @dev For the withdraw process, the assets follow this path:
    /// @dev WithdrawOrder -> PendingOrders -> AvailableAssets
    /// @dev The Index "0" MUST remain empty of any withdraw order.
    mapping(uint256 => Order) withdrawOrder;
    uint256 lastWithdrawOrderIndex;
    uint256 public totalWithdrawInQueue;

    /// @dev The Index "0" MUST remain empty of any pending order.
    mapping(uint256 => Order) pendingOrder;
    uint256 lastPendingOrderIndex;

    mapping(address => uint256) availableAssets;

    /// @dev The depositors and withdrawOrders arrays need to be looped.
    /// @dev We enforce limits to the size of this two arrays.
    uint256 maxWithdrawOrders;
    uint256 maxDepositors;

    modifier onlyStAurVault() {
        require(_msgSender() == stAurVault, "ONLY_FOR_STAUR_VAULT");
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

        _grantRole(ADMIN_ROLE, _msgSender());
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(OPERATOR_ROLE, _contractOperator);
    }

    function insertDepositor(
        address _depositor
    ) external onlyRole(DEPOSITORS_OWNER_ROLE) {
        require(depositors.length < maxDepositors, "DEPOSITORS_LIMIT_REACHED");
        depositors.push(_depositor);
        nextDepositor = _depositor;

        emit NewDepositorAdded(_msgSender(), _depositor);
    }

    function changeMaxDepositors(
        uint256 _maxDepositors
    ) external onlyRole(OPERATOR_ROLE) {
        require(_maxDepositors != maxDepositors, "INVALID_CHANGE");
        require(_maxDepositors >= depositors.length, "BELOW_CURRENT_LENGTH");
        maxDepositors = _maxDepositors;

        emit MaxDepositorsUpdate(_msgSender(), _maxDepositors);
    }

    function changeMaxWithdrawOrders(
        uint256 _maxWithdrawOrders
    ) external onlyRole(OPERATOR_ROLE) {
        require(_maxWithdrawOrders != maxWithdrawOrders, "INVALID_CHANGE");
        require(_maxWithdrawOrders >= lastWithdrawOrderIndex, "BELOW_CURRENT_LENGTH");
        maxWithdrawOrders = _maxWithdrawOrders;

        emit MaxWithdrawOrdersUpdate(_msgSender(), _maxWithdrawOrders);
    }

    function stopProcessingWithdrawOrders(
        bool _isProcessStopped
    ) external onlyRole(ADMIN_ROLE) {
        stopWithdrawOrders = _isProcessStopped;
        emit UpdateProcessWithdrawOrders(_msgSender(), _isProcessStopped);
    }

    /// @dev If the user do NOT have a withdraw order, expect an index of "0".
    function _getUserWithdrawOrderIndex(address _account) private view returns (uint256) {
        for (uint i = 1; i <= lastWithdrawOrderIndex; i++) {
            if (withdrawOrder[i].receiver == _account) {
                return i;
            }
        }
        return 0;
    }

    /// @dev If the user do NOT have a pending order, expect an index of "0".
    function _getUserPendingOrderIndex(address _account) private view returns (uint256) {
        for (uint i = 1; i <= lastPendingOrderIndex; i++) {
            if (pendingOrder[i].receiver == _account) {
                return i;
            }
        }
        return 0;
    }

    /// @notice Returns the amount of assets of a user in the withdraw orders.
    function getWithdrawOrderAssets(address _account) external view returns (uint256) {
        uint256 index = _getUserWithdrawOrderIndex(_account);
        return withdrawOrder[index].amount;
    }

    function getTotalWithdrawOrders() external view returns (uint256) {
        return lastWithdrawOrderIndex;
    }

    /// @notice Returns the amount of assets of a user in the pending orders.
    function getPendingOrderAssets(address _account) external view returns (uint256) {
        uint256 index = _getUserPendingOrderIndex(_account);
        return pendingOrder[index].amount;
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
    /// For tiebreaking use the depositor with lower index.
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
        _transferAurora(_receiver, _owner, _assets);
    }

    /// @notice This is an ALTERNATIVE withdraw, the regular flow should be using the
    /// StakedAuroraVault contract. However, in case of emergency 🛟, if this Manager
    /// contract is detached from the Vault, then users could recover remaining funds.
    function alternativeWithdraw(
        uint256 _assets,
        address _receiver
    ) external {
        require(
            IStakedAuroraVault(stAurVault).stakingManager() != address(this),
            "VAULT_AND_MANAGER_STILL_ATTACHED"
        );
        _transferAurora(_receiver, _msgSender(), _assets);
        emit AltWithdraw(_msgSender(), _receiver, _msgSender(), _assets);
    }

    /// @notice Unstaking Flow - Ran by ROBOT 🤖
    /// 1. Withdraw pending Aurora from depositors.
    /// 2. Move previous pending amount to Available.
    /// 3. Unstake withdraw orders.
    /// 4. Move withdraw orders to Pending.
    /// 5. Remove withdraw orders.
    /// @dev In case of emergency 🛟,
    /// the withdraw-orders process could be temporally stopped (3, 4, 5 steps).
    function cleanOrdersQueue() public {
        require(depositors.length > 0, "CREATE_DEPOSITOR");
        require(nextCleanOrderQueue <= block.timestamp, "WAIT_FOR_NEXT_CLEAN_ORDER");

        _withdrawFromDepositor();           // Step 1.
        _movePendingToAvailable();          // Step 2.

        if (!stopWithdrawOrders) {
            _unstakeWithdrawOrders();       // Step 3.
            _moveAndRemoveWithdrawOrders(); // Step 4 & 5.
        }

        // Update the timestamp for the next clean and total.
        (,,,,,,,,,uint256 tau,) = IAuroraStaking(auroraStaking).getStream(0);
        nextCleanOrderQueue = block.timestamp + tau;

        emit CleanOrdersQueue(_msgSender(), block.timestamp);
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
            withdrawOrder[lastWithdrawOrderIndex] = Order(_assets, _receiver);
        // Increase current withdraw order.
        } else {
            withdrawOrder[index].amount += _assets;
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
            address _receiver = pendingOrder[i].receiver;
            uint256 _amount = pendingOrder[i].amount;
            pendingOrder[i] = Order(0, address(0));
            availableAssets[_receiver] += _amount;
        }
        lastPendingOrderIndex = 0;
    }

    /// @dev In case of emergency 🛟,
    /// withdraw orders will not be unstaked to allow users to get funds back.
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
            uint256 _assets = withdrawOrder[i].amount;
            if (_assets > 0) {
                address _receiver = withdrawOrder[i].receiver;
                // Removing withdraw order.
                withdrawOrder[i] = Order(0, address(0));

                // Creating pending order.
                pendingOrder[i] = Order(_assets, _receiver);
            }
        }
        lastPendingOrderIndex = lastWithdrawOrderIndex;
        lastWithdrawOrderIndex = 0;        
        totalWithdrawInQueue = 0;
    }

    function _calculateStakeValue(uint256 _shares) private view returns (uint256) {
        IAuroraStaking aurora = IAuroraStaking(auroraStaking);
        uint256 denominator = aurora.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = _shares * aurora.getTotalAmountOfStakedAurora();
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }

    function _transferAurora(
        address _receiver,
        address _owner,
        uint256 _assets
    ) private {
        require(_assets > 0, "INVALID_ZERO_ASSETS_WITHDRAW");
        require(availableAssets[_owner] >= _assets, "NOT_ENOUGH_AVAILABLE_ASSETS");
        availableAssets[_owner] -= _assets;
        IERC20(auroraToken).safeTransfer(_receiver, _assets);
    }
}