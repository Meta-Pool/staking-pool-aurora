// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakingManager {
    function nextDepositor() external returns (address);
    function totalAssets() external returns (uint256);
}

interface IDepositor {
    function stake(uint256 _assets) external;
}

contract StAuroraToken is ERC4626, Ownable {

    address public stakingManager;

    constructor(address asset_) ERC4626(IERC20(asset_)) {}

    function updataStakingManager(address _stakingManager) public onlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function totalAssets() public view override returns (uint256) {
        require(stakingManager != address(0));
        return IStakingManager(stakingManager).totalAssets();
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        require(assets <= maxDeposit(receiver), "ERC4626: deposit more than max");

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
        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        IERC20 auroraToken = IERC20(asset());
        IStakingManager manager = IStakingManager(stakingManager);

        SafeERC20.safeTransferFrom(auroraToken, caller, address(this), assets);

        address depositor = manager.nextDepositor();
        SafeERC20.safeIncreaseAllowance(auroraToken, depositor, assets);
        IDepositor(depositor).stake(assets);

        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }
}
