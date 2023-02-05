// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IAuroraStaking {

    // struct User {
    //     uint256 deposit;
    //     uint256 auroraShares;
    //     uint256 streamShares;
    //     mapping(uint256 => uint256) pendings; // The amount of tokens pending release for user per stream
    //     mapping(uint256 => uint256) releaseTime; // The release moment per stream
    //     mapping(uint256 => uint256) rpsDuringLastClaim; // RPS or reward per share during the previous rewards claim
    // }
    
    // mapping(address => User) public users;

    function totalAuroraShares() external view returns (uint256);
    function getUserShares(address account) external view returns (uint256);
    function getTotalAmountOfStakedAurora() external view returns (uint256);
}

interface IStAuroraToken {
    function previewWithdraw(uint256 assets) external returns (uint256);
    function previewRedeem(uint256 shares) external returns (uint256);
    function burn(address owner, uint256 shares) external;
}

contract StakingManager is AccessControl {

    bytes32 public constant DEPOSITORS_OWNER_ROLE = keccak256("DEPOSITORS_OWNER_ROLE");

    address immutable public stAurora;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    address[] public depositors;
    address public nextDepositor;
    mapping(address => uint256) depositorShares;

    mapping(address => uint256) availableAssets;

    withdrawOrder[] withdrawOrders;
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

        _grantRole(DEPOSITORS_OWNER_ROLE, _depositorOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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

    function getTotalAssetsFromDepositors() public view returns (uint256) {
        uint256 arrayLength = depositors.length;
        uint256 depositorsAuroraShares = 0;
        IAuroraStaking auroraContract = IAuroraStaking(auroraStaking);

        if (arrayLength == 0) return 0;
        for (uint i=0; i<arrayLength; i++) {
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
        return getTotalAssetsFromDepositors() + lpTotalAsset;
    }

    function availableToWithdraw(
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
        require(availableToWithdraw(assets, owner), "NOT_ENOUGH_AVAILABLE_ASSETS");
        availableAssets[owner] -= assets;
        SafeERC20.safeTransferFrom(IERC20(auroraToken), address(this), receiver, assets);
    }

    /// UNSTAKING FLOW

    // /** ROBOT 🤖 */
    // function claimDepositorPending(uint256 depositorId) {

    // }

    function createWithdrawOrder(uint256 assets, address receiver) private {
        require(withdrawOrders.length <= maxWithdrawOrders, "TOO_MANY_WITHDRAW_ORDERS");
        withdrawOrders.push(
            withdrawOrder(assets, receiver)
        );
    }

    /**
     * @dev The unstake function triggers the delayed withdraw.
     */
    function unstakeAssets(uint256 assets, address receiver) public {
        IStAuroraToken stAuroraToken = IStAuroraToken(stAurora);
        uint256 shares = stAuroraToken.previewWithdraw(assets);
        stAuroraToken.burn(msg.sender, shares);
        createWithdrawOrder(assets, receiver);
    }

    function unstakeShares(uint256 shares, address receiver) public {
        IStAuroraToken stAuroraToken = IStAuroraToken(stAurora);
        uint256 assets = stAuroraToken.previewRedeem(shares);
        stAuroraToken.burn(msg.sender, shares);
        createWithdrawOrder(assets, receiver);
    }

    /** @dev See {IERC4626-withdraw}. */
    function liquidWithdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public returns (uint256) {
        // require(false, "inimplemented");
        // require(assets <= maxWithdraw(owner), "ERC4626: withdraw more than max");

        // uint256 shares = previewWithdraw(assets);
        // _withdraw(_msgSender(), receiver, owner, assets, shares);

        // return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    function liquidRedeem(
        uint256 shares,
        address receiver,
        address owner
    ) public returns (uint256) {
        // require(false, "inimplemented");
        // require(shares <= maxRedeem(owner), "ERC4626: redeem more than max");

        // uint256 assets = previewRedeem(shares);
        // _withdraw(_msgSender(), receiver, owner, assets, shares);

        // return assets;
    }

}
