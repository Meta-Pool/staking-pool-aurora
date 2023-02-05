// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

interface IStakingManager {
    function nextDepositor() external view returns (address);
    function totalAssets() external view returns (uint256);
    function setNextDepositor() external;
    function transferAurora(address receiver, address owner, uint256 assets) external;
}

interface IDepositor {
    function stake(uint256 _assets) external;
}

contract StAuroraToken is ERC4626, Ownable {

    address public stakingManager;
    uint256 public minDepositAmount;

    modifier onlyManager() {
        msg.sender == stakingManager;
        _;
    }

    constructor(
        address _asset,
        string memory _stAuroraName,
        string memory _stAuroraSymbol,
        uint256 _minDepositAmount
    )
        ERC4626(IERC20(_asset))
        ERC20(_stAuroraName, _stAuroraSymbol) {
        minDepositAmount = _minDepositAmount;
    }

    function updataStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function updateMinDepositAmount(uint256 _amount) external onlyOwner {
        minDepositAmount = _amount;
    }

    function totalAssets() public view override returns (uint256) {
        require(stakingManager != address(0));
        return IStakingManager(stakingManager).totalAssets();
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        require(assets <= maxDeposit(receiver), "ERC4626: deposit more than max");
        require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-mint}.
     *
     * As opposed to {deposit}, minting is allowed even if the vault is in a state where the price of a share is zero.
     * In this case, the shares will be minted without requiring any assets to be deposited.
     */
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        require(shares <= maxMint(receiver), "ERC4626: mint more than max");

        uint256 assets = previewMint(shares);
        require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");
        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /** @dev See {IERC4626-withdraw}. */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override returns (uint256) {
        require(assets <= maxWithdraw(owner), "ERC4626: withdraw more than max");

        uint256 shares = previewWithdraw(assets);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(shares);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return assets;
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        IERC20 auroraToken = IERC20(asset());
        IStakingManager manager = IStakingManager(stakingManager);
        SafeERC20.safeTransferFrom(auroraToken, caller, address(this), assets);

        address depositor = manager.nextDepositor();
        SafeERC20.safeIncreaseAllowance(auroraToken, depositor, assets);
        IDepositor(depositor).stake(assets);
        manager.setNextDepositor();

        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // IMPORTANT!!! IF this withdraw only works with delayed unstake, then
        // the burn is already made by the staking manager.
        // _burn(owner, shares);

        IStakingManager(stakingManager).transferAurora(receiver, owner, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    function burn(address owner, uint256 shares) external onlyManager {
        _burn(owner, shares);
    }
}
