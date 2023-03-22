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

contract StakingManager is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant DEPOSITORS_OWNER_ROLE = keccak256("DEPOSITORS_OWNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address immutable public stAurVault;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    uint256 public nextCleanOrderQueue;

    address[] public depositors;
    address public nextDepositor;
    mapping(address => uint256) depositorShares;

    mapping(address => uint256) availableAssets;

    withdrawOrder[] withdrawOrders;
    withdrawOrder[] pendingOrders;

    uint256 totalWithdrawInQueue;

    // TODO: Not sure if this should become immutable.
    // What if you use a fixed size array?
    // ... or use the mapping trick? 🤷
    uint256 maxWithdrawOrders;

    uint256 public lpTotalAsset;
    uint256 public lpTotalShare;

    struct withdrawOrder {
        uint256 assets;
        address receiver;
    }

    modifier onlyStAurVault() {
        require(msg.sender == stAurVault);
        _;
    }

    constructor(
        address _stAurVault,
        address _auroraStaking,
        address _depositorOwner,
        uint256 _maxWithdrawOrders
    ) {
        require(
            _stAurVault != address(0)
                && _auroraStaking != address(0)
                && _depositorOwner != address(0)
        );
        stAurVault = _stAurVault;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(_stAurVault).asset();
        maxWithdrawOrders = _maxWithdrawOrders;
        nextCleanOrderQueue = block.timestamp;

        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function insertDepositor(address _depositor) external onlyRole(DEPOSITORS_OWNER_ROLE) {
        depositors.push(_depositor);
        nextDepositor = _depositor;
    }

    /**
     * VIEW FUNCTIONS
     */
    function getWithdrawOrderAssets(address _account) public view returns (uint256) {
        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == _account) {
                return withdrawOrders[i].assets;
            }
        }
        return 0;
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

    function setNextDepositor() public onlyStAurVault {
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

    function _calculateStakeValue(uint256 _shares) private view returns (uint256) {
        IAuroraStaking aurora = IAuroraStaking(auroraStaking);
        uint256 denominator = aurora.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = _shares * aurora.getTotalAmountOfStakedAurora();
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
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
        // console.log("available assets: %s", availableAssets[_owner]);
        // console.log("total     assets: %s", _assets);
        return availableAssets[_owner] >= _assets;
    }

    function transferAurora(
        address _receiver,
        address _owner,
        uint256 _assets
    ) external onlyStAurVault {
        // console.log("WE ARE HERE");
        // console.log("Assets  : %s", _assets);
        // console.log("Availab : %s", availableAssets[_owner]);
        require(isAvailableToWithdraw(_assets, _owner), "NOT_ENOUGH_AVAILABLE_ASSETS");
        // console.log("ASSESTS ARE ENOUGH");
        availableAssets[_owner] -= _assets;
        IERC20 token = IERC20(auroraToken);
        // console.log("Pay the allowance here! 0000000000");
        token.safeTransfer(_receiver, _assets);
    }

    function getTotalWithdrawInQueue() public view returns (uint256) {
        return totalWithdrawInQueue;
    }

    /// UNSTAKING FLOW

    /** ROBOT 🤖
     * 1. Withdraw pending Aurora from depositors.
     * 2. Move previous pending amount to Available.
     * 3. Unstake withdraw orders.
     * 4. Move withdraw orders to Pending.
     * 5. Remove withdraw orders.
    */
    function cleanOrdersQueue() public {
        require(depositors.length > 0);
        require(nextCleanOrderQueue <= block.timestamp, "WAIT_FOR_NEXT_CLEAN_ORDER");

        // console.log("__START Depositor 00: %s", getTotalAssetsFromDepositor(depositors[0]));
        // console.log("__START Depositor 01: %s", getTotalAssetsFromDepositor(depositors[1]));

        // console.log("I will assume we are failing here!");
        _withdrawFromDepositor();   // Step 1.
        // console.log("FINALE I will assume we are failing here!");
        // console.log("__   01 Depositor 00: %s", getTotalAssetsFromDepositor(depositors[0]));
        // console.log("__   01 Depositor 01: %s", getTotalAssetsFromDepositor(depositors[1]));
        _movePendingToAvailable();  // Step 2.
        // console.log("__   02 Depositor 00: %s", getTotalAssetsFromDepositor(depositors[0]));
        // console.log("__   02 Depositor 01: %s", getTotalAssetsFromDepositor(depositors[1]));
        // console.log("I will assume we are failing here!");
        _unstakeWithdrawOrders();   // Step 3.
        // console.log("FINALE I will assume we are failing here!");
        // console.log("__   03 Depositor 00: %s", getTotalAssetsFromDepositor(depositors[0]));
        // console.log("__   03 Depositor 01: %s", getTotalAssetsFromDepositor(depositors[1]));

        // Step 4 & 5. TODO: We need help from Batman 🦇.
        pendingOrders = withdrawOrders; // TODO: Problems! try not to copy the array ⚠️
        delete withdrawOrders;
        // withdrawOrders = new withdrawOrder[](0);
        (,,,,,,,,,uint256 tau,) = IAuroraStaking(auroraStaking).getStream(0);
        nextCleanOrderQueue = block.timestamp + tau;
        totalWithdrawInQueue = 0;
    }

    function createWithdrawOrder(uint256 _assets, address _receiver) private {
        require(withdrawOrders.length <= maxWithdrawOrders, "TOO_MANY_WITHDRAW_ORDERS");
        totalWithdrawInQueue += _assets;

        // console.log("ASSETS >>>>>>>> %s", _assets);

        // TODO: Multiple storage access. It might fail. ⚠️
        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == _receiver) {
                withdrawOrder storage oldOrder = withdrawOrders[i];
                oldOrder.assets += _assets;
                return;
            }
        }
        withdrawOrders.push(withdrawOrder(_assets, _receiver));
    }

    function unstakeShares(
        uint256 _assets,
        uint256 _shares,
        address _receiver,
        address _owner
    ) external onlyStAurVault {
        _unstake(_assets, _shares, _receiver, _owner);
    }

    function _unstake(uint256 _assets, uint256 _shares, address _receiver, address _owner) private {
        IStakedAuroraVault(stAurVault).burn(_owner, _shares);
        createWithdrawOrder(_assets, _receiver);
    }

    function _withdrawFromDepositor() private {
        // console.log("*******");
        for (uint i = 0; i < depositors.length; i++) {
            address depositor = depositors[i];
            uint256 pendingAmount = IDepositor(depositor).getPending(depositors[i]);
            // console.log("PENDING AMOUNT DEP %s: %s", i, pendingAmount);
            if (pendingAmount > 0) {
                IDepositor(depositor).withdraw(pendingAmount);
            }
        }
        // console.log("*******");
    }

    function _movePendingToAvailable() private {
        for (uint i = 0; i < pendingOrders.length; i++) {
            withdrawOrder memory order = pendingOrders[i];
            availableAssets[order.receiver] += order.assets;
        }
        // TODO: Problems!!
        delete pendingOrders;
    }

    function _unstakeWithdrawOrders() private {
        uint256 totalWithdraw = getTotalWithdrawInQueue();
        uint256 alreadyWithdraw = 0;

        // TODO: CAUTION ⛔ keep an eye on this logic.
        if (totalWithdraw > 0) {
            for (uint i = depositors.length; i > 0; i--) {
                address depositor = depositors[i-1];
                uint256 assets = getTotalAssetsFromDepositor(depositor);
                if (assets == 0) continue;
                // console.log("DEP %s Assets: %s", i-1, assets);
                uint256 nextWithdraw = totalWithdraw - alreadyWithdraw;

                // console.log("BEFORE UNSTAKE DEPOSITOR %s Assets: %s", i-1, IAuroraStaking(auroraStaking).getUserShares(depositor));
                if (assets >= nextWithdraw) {
                    IDepositor(depositor).unstake(nextWithdraw);
                    alreadyWithdraw += nextWithdraw;
                } else {
                    IDepositor(depositor).unstakeAll();
                    alreadyWithdraw += assets;
                }
                // console.log("AFTER  UNSTAKE DEPOSITOR %s Assets: %s", i-1, IAuroraStaking(auroraStaking).getUserShares(depositor));
                updateDepositorShares(depositor);
                if (alreadyWithdraw == totalWithdraw) return;
            }
        }
    }
}