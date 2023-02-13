// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

interface IAuroraStaking {

    enum StreamStatus {
        INACTIVE,
        PROPOSED,
        ACTIVE
    }

    function totalAuroraShares() external view returns (uint256);
    function getUserShares(address account) external view returns (uint256);
    function getTotalAmountOfStakedAurora() external view returns (uint256);

    function getStream(uint256 streamId)
        external
        view
        returns (
            address streamOwner,
            address rewardToken,
            uint256 auroraDepositAmount,
            uint256 auroraClaimedAmount,
            uint256 rewardDepositAmount,
            uint256 rewardClaimedAmount,
            uint256 maxDepositAmount,
            uint256 lastTimeOwnerClaimed,
            uint256 rps,
            uint256 tau,
            StreamStatus status
        );
}

interface IDepositor {
    function unstake(uint256 _assets) external;
    function unstakeAll() external;

    function withdraw() external;

    function getPending(address account)
        external
        view
        returns (uint256);
}

interface IStakedAuroraVault {
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function burn(address owner, uint256 shares) external;
    function balanceOf(address account) external view returns (uint256);
}

contract StakingManager is AccessControl {

    bytes32 public constant DEPOSITORS_OWNER_ROLE = keccak256("DEPOSITORS_OWNER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address immutable public stAurora;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    uint256 public tauAuroraStream;
    uint256 public nextCleanOrderQueue;

    address[] public depositors;
    address public nextDepositor;
    mapping(address => uint256) depositorShares;

    mapping(address => uint256) availableAssets;

    withdrawOrder[] withdrawOrders;
    withdrawOrder[] pendingOrders;
    uint256 maxWithdrawOrders;

    uint256 public lpTotalAsset;
    uint256 public lpTotalShare;

    struct withdrawOrder {
        uint256 assets;
        address receiver;
    }

    modifier onlyStAurora() {
        require(msg.sender == stAurora);
        _;
    }

    constructor(
        address _stAurora,
        address _auroraStaking,
        address _depositorOwner,
        uint256 _maxWithdrawOrders
    ) {
        require(
            _stAurora != address(0)
                && _auroraStaking != address(0)
                && _depositorOwner != address(0)
        );
        stAurora = _stAurora;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(stAurora).asset();
        maxWithdrawOrders = _maxWithdrawOrders;
        nextCleanOrderQueue = block.timestamp;

        _internalUpdateTau();

        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * VIEW FUNCTIONS
     */
    function getWithdrawOrderAssets(address account) public view returns (uint256) {
        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == account) {
                return withdrawOrders[i].assets;
            }
        }
        return 0;
    }

    function getPendingOrderAssets(address account) public view returns (uint256) {
        for (uint i = 0; i < pendingOrders.length; i++) {
            if (pendingOrders[i].receiver == account) {
                return pendingOrders[i].assets;
            }
        }
        return 0;
    }

    function _internalUpdateTau() private {
        (,,,,,,,,,uint256 tau,) = IAuroraStaking(auroraStaking).getStream(0);
        tauAuroraStream = tau;
    }

    function updateTauAuroraStream() public onlyRole(OPERATOR_ROLE) {
        _internalUpdateTau();
    }

    function isAdmin(address _address) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _address);
    }

    function isDepositorsOwner(address _address) public view returns (bool) {
        return hasRole(DEPOSITORS_OWNER_ROLE, _address);
    }

    function insertDepositor(address _depositor) external onlyRole(DEPOSITORS_OWNER_ROLE) {
        depositors.push(_depositor);
        nextDepositor = _depositor;
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
        require(depositors.length > 0);
        require(depositorExists(_depositor), "UNEXISTING_DEPOSITOR");
        depositorShares[_depositor] = IAuroraStaking(auroraStaking).getUserShares(_depositor);
    }

    function setNextDepositor() public onlyStAurora {
        require(depositors.length > 0);
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

    function getTotalAssetsFromDepositor(address depositor) public view returns (uint256) {
        uint256 arrayLength = depositors.length;
        uint256 depositorAuroraShares = 0;
        IAuroraStaking auroraContract = IAuroraStaking(auroraStaking);

        if (arrayLength == 0) return 0;
        depositorAuroraShares += depositorShares[depositor];
        if (depositorAuroraShares == 0) return 0;
        uint256 denominator = auroraContract.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = (depositorAuroraShares *
            auroraContract.getTotalAmountOfStakedAurora());
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }

    function getTotalAssetsFromDepositors() public view returns (uint256) {
        uint256 arrayLength = depositors.length;
        uint256 depositorsAuroraShares = 0;
        IAuroraStaking auroraContract = IAuroraStaking(auroraStaking);

        if (arrayLength == 0) return 0;
        for (uint i = 0; i < arrayLength; i++) {
            depositorsAuroraShares += depositorShares[depositors[i]];
        }
        if (depositorsAuroraShares == 0) return 0;
        uint256 denominator = auroraContract.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = (depositorsAuroraShares *
            auroraContract.getTotalAmountOfStakedAurora());
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }

    function totalAssets() external view returns (uint256) {
        return getTotalAssetsFromDepositors();
    }

    function isAvailableToWithdraw(
        uint256 assets,
        address owner
    ) public view returns (bool) {
        return availableAssets[owner] >= assets;
    }

    function transferAurora(
        address receiver,
        address owner,
        uint256 assets
    ) external onlyStAurora {
        require(isAvailableToWithdraw(assets, owner), "NOT_ENOUGH_AVAILABLE_ASSETS");
        availableAssets[owner] -= assets;
        SafeERC20.safeTransferFrom(IERC20(auroraToken), address(this), receiver, assets);
    }

    function getTotalWithdrawInQueue() public view returns (uint256) {
        uint256 result = 0;
        for (uint i = 0; i < withdrawOrders.length; i++) {
            withdrawOrder memory order = withdrawOrders[i];
            result += order.assets;
        }
        return result;
    }

    /// UNSTAKING FLOW

    /** ROBOT 🤖
     * 1. Withdraw from depositor.
     * 2. Move pending to Available.
     * 3. Unstake withdraw orders.
     * 4. Move withdraw orders to Pending.
     * 5. Remove withdraw orders.
    */
    function cleanOrdersQueue() public {
        require(depositors.length > 0);
        require(nextCleanOrderQueue <= block.timestamp, "WAIT_FOR_NEXT_CLEAN_ORDER");

        _withdrawFromDepositor();   // Step 1.
        _movePendingToAvailable();  // Step 2.
        _unstakeWithdrawOrders();   // Step 3.

        // Step 4 & 5. TODO: We need help from Batman 🦇.
        pendingOrders = withdrawOrders;
        delete withdrawOrders;
        nextCleanOrderQueue += tauAuroraStream;
    }

    function createWithdrawOrder(uint256 assets, address receiver) private {
        require(withdrawOrders.length <= maxWithdrawOrders, "TOO_MANY_WITHDRAW_ORDERS");
        for (uint i = 0; i < withdrawOrders.length; i++) {
            if (withdrawOrders[i].receiver == receiver) {
                withdrawOrder storage oldOrder = withdrawOrders[i];
                oldOrder.assets += assets;
                return;
            }
        }
        withdrawOrders.push(withdrawOrder(assets, receiver));
    }

    /**
     * @dev The unstake function triggers the delayed withdraw.
     */
    function unstakeAssets(uint256 assets, address receiver) public {
        IStakedAuroraVault stakedAuroraVault = IStakedAuroraVault(stAurora);
        uint256 shares = stakedAuroraVault.previewWithdraw(assets);
        stakedAuroraVault.burn(msg.sender, shares);
        createWithdrawOrder(assets, receiver);
    }

    function unstakeShares(uint256 shares, address receiver) public {
        IStakedAuroraVault stakedAuroraVault = IStakedAuroraVault(stAurora);
        uint256 assets = stakedAuroraVault.previewRedeem(shares);
        stakedAuroraVault.burn(msg.sender, shares);
        createWithdrawOrder(assets, receiver);
    }

    function unstakeAll(address receiver) public {
        IStakedAuroraVault stakedAuroraVault = IStakedAuroraVault(stAurora);
        uint256 shares = stakedAuroraVault.balanceOf(msg.sender);
        uint256 assets = stakedAuroraVault.previewRedeem(shares);
        stakedAuroraVault.burn(msg.sender, shares);
        createWithdrawOrder(assets, receiver);
    }

    // /** @dev See {IERC4626-withdraw}. */
    // function liquidWithdraw(
    //     uint256 assets,
    //     address receiver,
    //     address owner
    // ) public returns (uint256) {
    //     require(false, "unimplemented");
    // }

    // /** @dev See {IERC4626-redeem}. */
    // function liquidRedeem(
    //     uint256 shares,
    //     address receiver,
    //     address owner
    // ) public returns (uint256) {
    //     require(false, "unimplemented");
    // }

    function _withdrawFromDepositor() private {
        for (uint i = 0; i < depositors.length; i++) {
            address depositor = depositors[i];
            uint256 pendingAmount = IDepositor(depositor).getPending(depositors[i]);
            if (pendingAmount > 0) {
                IDepositor(depositor).withdraw();
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
        uint256 accum = 0;

        if (totalWithdraw > 0) {
            for (uint i = depositors.length; i > 0; i--) {
                address depositor = depositors[i-1];
                uint256 assets = getTotalAssetsFromDepositor(depositor);
                if (assets >= (totalWithdraw + accum)) {
                    IDepositor(depositor).unstake(totalWithdraw);
                } else {
                    IDepositor(depositor).unstakeAll();
                    accum += assets;
                }
                updateDepositorShares(depositor);
            }
        }
    }
}
