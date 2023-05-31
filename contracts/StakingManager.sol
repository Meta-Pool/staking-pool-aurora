// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool stAUR 🪐 staking manager contract.

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
/// - The StakingManager contract manage most of the logic for the "Liquid Staking
///   Protocol".
///   This contract only briefly holds the AURORA tokens that were withdraw using an
///   Order.
///   So, in case of an emergency, the logic of this contract can be updated, deploying
///   a NEW contract Manager, leaving the stAUR ledger and the AURORA tokens safely.

/// **Steps in case of Emergency** 🛟:
/// 1. Keep calm. Find the ADMIN_ROLE account(s) to operate emergency functions.
/// 2. Pause all deposits and redeems from the StakedAuroraVault contract.
///    StakedAuroraVault.updateContractOperation(false)
/// 3. Keep running the cleanOrdersQueue fn until all orders (withdraw, pending) are
///    processed and available. If there is an issue, you could relief the load of the 🤖
///    by stop the processing of the Withdraw orders. This will allow the process the
///    pending orders, and when those are available, then process the rest.
/// 4. Deploy a new Manager and update the address in the Vault and in Depositors.
/// 5. Pending tokens could be removed from the old Manager with the alternativeWithdraw.

contract StakingManager is AccessControl, IStakingManager {
    using SafeERC20 for IERC20;

    /// @dev If there are problems with the clean-orders,
    /// you can temporally stop processing withdraw orders.
    bool public stopWithdrawOrders;

    /// @dev 1 Hour of safety buffer before the Depositors can withdraw.
    uint256 public constant SAFETY_BUFFER = 3_600;

    /// @notice The depositors and withdrawOrders arrays need to be looped.
    /// We enforce limits to the size of this two arrays.
    /// @dev Safe value to aviod DOS attack.
    uint256 public constant MAX_MAX_WITHDRAW_ORDERS = 200;
    uint256 public constant MIN_MAX_WITHDRAW_ORDERS = 50;
    uint256 public constant MAX_DEPOSITORS = 20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
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

    uint256 maxWithdrawOrders;

    modifier onlyStAurVault() {
        if (msg.sender != stAurVault) { revert Unauthorized(); }
        _;
    }

    constructor(
        address _stAurVault,
        address _auroraStaking,
        address _contractOperatorRole,
        uint256 _maxWithdrawOrders
    ) {
        if (_stAurVault == address(0)
                || _auroraStaking == address(0)
                || _contractOperatorRole == address(0)) {
            revert InvalidZeroAddress();
        }
        stAurVault = _stAurVault;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(_stAurVault).asset();
        maxWithdrawOrders = _maxWithdrawOrders;
        nextCleanOrderQueue = block.timestamp;

        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, _contractOperatorRole);
    }

    receive() external payable {}

    /// @notice Depositors can only be inserted and not removed because Depositors
    /// hold users funds. Instead, we hard-code the MAX_DEPOSITORS value.
    function insertDepositor(
        address _depositor
    ) external onlyRole(ADMIN_ROLE) {
        if (getDepositorsLength() >= MAX_DEPOSITORS) { revert DepositorsLimitReached(); }
        if (depositorExists(_depositor)) { revert DepositorExists(); }
        depositors.push(_depositor);
        nextDepositor = _depositor;
        _updateDepositorShares(_depositor);

        emit NewDepositorAdded(_depositor, msg.sender);
    }

    function changeMaxWithdrawOrders(
        uint256 _maxWithdrawOrders
    ) external onlyRole(OPERATOR_ROLE) {
        if (_maxWithdrawOrders == maxWithdrawOrders) { revert InvalidChange(); }
        if (_maxWithdrawOrders < getTotalWithdrawOrders()) { revert BelowCurrentLength(); }
        if (_maxWithdrawOrders > MAX_MAX_WITHDRAW_ORDERS) { revert AvobeMaxOrders(); }
        if (_maxWithdrawOrders < MIN_MAX_WITHDRAW_ORDERS) { revert BellowMaxOrders(); }
        maxWithdrawOrders = _maxWithdrawOrders;

        emit MaxWithdrawOrdersUpdate(_maxWithdrawOrders, msg.sender);
    }

    function stopProcessingWithdrawOrders(
        bool _isProcessStopped
    ) external onlyRole(ADMIN_ROLE) {
        stopWithdrawOrders = _isProcessStopped;

        emit UpdateProcessWithdrawOrders(_isProcessStopped, msg.sender);
    }

    /// @dev If the user do NOT have a withdraw order, expect an index of "0".
    function _getUserWithdrawOrderIndex(address _account) private view returns (uint256) {
        uint256 _totalOrders = getTotalWithdrawOrders();
        for (uint i = 1; i <= _totalOrders; ++i) {
            if (withdrawOrder[i].receiver == _account) {
                return i;
            }
        }
        return 0;
    }

    /// @dev If the user do NOT have a pending order, expect an index of "0".
    function _getUserPendingOrderIndex(address _account) private view returns (uint256) {
        uint256 _totalOrders = getTotalPendingOrders();
        for (uint i = 1; i <= _totalOrders; ++i) {
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

    function getTotalWithdrawOrders() public view returns (uint256) {
        return lastWithdrawOrderIndex;
    }

    /// @notice Returns the estimated timestamp of availability for funds in:
    /// withdraw or pending orders.
    function getAvailableTimestamp(
        bool _isWithdrawOrder
    ) external view returns (uint256) {
        if (_isWithdrawOrder) {
            return nextCleanOrderQueue + _getAuroraTau();
        }
        return nextCleanOrderQueue;
    }

    /// @notice Returns the amount of assets of a user in the pending orders.
    function getPendingOrderAssets(address _account) external view returns (uint256) {
        uint256 index = _getUserPendingOrderIndex(_account);
        return pendingOrder[index].amount;
    }

    function getTotalPendingOrders() public view returns (uint256) {
        return lastPendingOrderIndex;
    }

    /// @notice Returns the amount of available assets of a user.
    function getAvailableAssets(address _account) external view returns (uint256) {
        return availableAssets[_account];
    }

    function getDepositorsLength() public view returns (uint256) {
        return depositors.length;
    }

    function getDepositorShares(address _depositor) external view returns (uint256) {
        return depositorShares[_depositor];
    }

    function depositorExists(address _depositor) public view returns (bool) {
        uint256 _totalDepositors = getDepositorsLength();
        for (uint i = 0; i < _totalDepositors; ++i) {
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
        uint256 _totalDepositors = getDepositorsLength();
        for (uint i = 0; i < _totalDepositors; ++i) {
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
        uint256 _totalDepositors = getDepositorsLength();
        for (uint i = 0; i < _totalDepositors; ++i) {
            depositorsAuroraShares += depositorShares[depositors[i]];
        }
        if (depositorsAuroraShares == 0) return 0;
        return _calculateStakeValue(depositorsAuroraShares);
    }

    function totalAssets() external view returns (uint256) {
        return getTotalAssetsFromDepositors() - totalWithdrawInQueue;
    }

    /// @notice AURORA tokens are transfer to the users on the withdraw process,
    /// triggered only by the stAUR vault.
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
        if (IStakedAuroraVault(stAurVault).stakingManager() == address(this)) {
            revert VaultAndManagerStillAttached();
        }
        _transferAurora(_receiver, msg.sender, _assets);

        emit AltWithdraw(msg.sender, _receiver, msg.sender, _assets);
    }

    /// @notice Unstaking Flow - Ran by ROBOT 🤖
    ///   1. Withdraw pending AURORA from depositors.
    ///   2. Move previous pending amount to Available.
    ///   3. Unstake withdraw orders.
    ///   4. Move withdraw orders to Pending.
    ///   5. Remove withdraw orders.
    /// @dev In case of emergency 🛟,
    ///   the withdraw-orders process could be temporally stopped (3, 4, 5 steps).
    function cleanOrdersQueue() public {
        if (getDepositorsLength() == 0) { revert NoDepositors(); }
        if (nextCleanOrderQueue > block.timestamp) { revert WaitForNextCleanOrders(); }

        _withdrawFromDepositor();           // Step 1.
        _movePendingToAvailable();          // Step 2.

        if (!stopWithdrawOrders) {
            _unstakeWithdrawOrders();       // Step 3.
            _moveAndRemoveWithdrawOrders(); // Step 4 & 5.
        }

        // Update the timestamp for the next clean and total.
        uint256 _nextCleanOrderQueue = block.timestamp + _getAuroraTau();
        nextCleanOrderQueue = _nextCleanOrderQueue;

        emit CleanOrdersQueue(_nextCleanOrderQueue);
    }

    /// @notice stAUR vault calls this function when a user ask for a withdraw/redeem.
    function createWithdrawOrder(
        uint256 _assets,
        address _receiver
    ) external onlyStAurVault {
        totalWithdrawInQueue += _assets;
        uint256 index = _getUserWithdrawOrderIndex(_receiver);
        uint256 _totalOrders = getTotalWithdrawOrders();
        // Create a new withdraw order.
        if (index == 0) {
            uint256 _maxOrders = maxWithdrawOrders;
            if (_totalOrders >= _maxOrders) { revert MaxOrdersExceeded(_maxOrders); }
            uint256 _nextIndex = _totalOrders + 1;
            lastWithdrawOrderIndex = _nextIndex;
            withdrawOrder[_nextIndex] = Order(_assets, _receiver);
        // Increase current withdraw order.
        } else {
            withdrawOrder[index].amount += _assets;
        }
    }

    /// @dev The tau is the pending release period for the AURORA stream.
    function _getAuroraTau() private view returns (uint256) {
        (,,,,,,,,,uint256 tau,) = IAuroraStaking(auroraStaking).getStream(0);
        return tau + SAFETY_BUFFER;
    }

    function _withdrawFromDepositor() private {
        uint256 _totalDepositors = getDepositorsLength();
        for (uint i = 0; i < _totalDepositors; ++i) {
            address depositor = depositors[i];
            uint256 pendingAmount = IDepositor(depositor).getPendingAurora();
            if (pendingAmount > 0) {
                IDepositor(depositor).withdraw(pendingAmount);
            }
        }
    }

    function _movePendingToAvailable() private {
        uint256 _totalOrders = getTotalPendingOrders();
        for (uint i = 1; i <= _totalOrders; ++i) {
            Order memory order = pendingOrder[i];
            pendingOrder[i] = Order(0, address(0));
            availableAssets[order.receiver] += order.amount;
        }
        lastPendingOrderIndex = 0;
    }

    /// @dev In case of emergency 🛟,
    /// withdraw orders will not be unstaked to allow users to get funds back.
    function _unstakeWithdrawOrders() private {
        uint256 alreadyWithdraw = 0;
        uint256 _totalDepositors = getDepositorsLength();
        uint256 _totalWithdrawInQueue = totalWithdrawInQueue;
        if (totalWithdrawInQueue > 0) {
            for (uint i = _totalDepositors; i > 0; --i) {
                address depositor = depositors[i-1];
                uint256 assets = getTotalAssetsFromDepositor(depositor);
                if (assets == 0) continue;
                uint256 nextWithdraw = _totalWithdrawInQueue - alreadyWithdraw;

                if (assets >= nextWithdraw) {
                    IDepositor(depositor).unstake(nextWithdraw);
                    alreadyWithdraw += nextWithdraw;
                } else {
                    IDepositor(depositor).unstakeAll();
                    alreadyWithdraw += assets;
                }
                _updateDepositorShares(depositor);
                if (alreadyWithdraw == _totalWithdrawInQueue) return;
            }
        }
    }

    function _moveAndRemoveWithdrawOrders() private {
        uint256 _totalOrders = getTotalWithdrawOrders();
        for (uint i = 1; i <= _totalOrders; ++i) {
            Order memory order = withdrawOrder[i];
            uint256 _assets = order.amount;
            if (_assets > 0) {
                address _receiver = order.receiver;
                // Removing withdraw order.
                withdrawOrder[i] = Order(0, address(0));

                // Creating pending order.
                pendingOrder[i] = Order(_assets, _receiver);
            }
        }
        lastPendingOrderIndex = _totalOrders;
        lastWithdrawOrderIndex = 0;        
        totalWithdrawInQueue = 0;
    }

    function _calculateStakeValue(uint256 _shares) private view returns (uint256) {
        IAuroraStaking aurora = IAuroraStaking(auroraStaking);
        uint256 denominator = aurora.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = _shares * aurora.getTotalAmountOfStakedAurora();
        return numerator / denominator;
    }

    function _transferAurora(
        address _receiver,
        address _owner,
        uint256 _assets
    ) private {
        if (_assets == 0) { revert InvalidZeroAmount(); }
        if (availableAssets[_owner] < _assets) { revert NotEnoughBalance(); }
        availableAssets[_owner] -= _assets;
        IERC20(auroraToken).safeTransfer(_receiver, _assets);
    }
}