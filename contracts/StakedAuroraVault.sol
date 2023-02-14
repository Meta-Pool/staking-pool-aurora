// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

interface IStakingManager {
    function nextDepositor() external view returns (address);
    function totalAssets() external view returns (uint256);
    function setNextDepositor() external;
    function transferAurora(address receiver, address owner, uint256 assets) external;
}

interface IDepositor {
    function stake(uint256 _assets) external;
}

contract StakedAuroraVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    address public stakingManager;
    uint256 public minDepositAmount;

    modifier onlyManager() {
        require(
            stakingManager != address(0)
                && msg.sender == stakingManager,
            "ONLY_STAKING_MANAGER"
        );
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

    function updateStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function updateMinDepositAmount(uint256 _amount) external onlyOwner {
        minDepositAmount = _amount;
    }

    function totalAssets() public view override returns (uint256) {
        if (stakingManager == address(0)) return 0;
        return IStakingManager(stakingManager).totalAssets();
    }

    /** @dev See {IERC4626-deposit}. */
    function deposit(uint256 _assets, address _receiver) public override returns (uint256) {
        require(_assets <= maxDeposit(_receiver), "ERC4626: deposit more than max");
        require(_assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");

        uint256 shares = previewDeposit(_assets);
        _deposit(_msgSender(), _receiver, _assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-mint}.
     *
     * As opposed to {deposit}, minting is allowed even if the vault is in a state where the price of a share is zero.
     * In this case, the shares will be minted without requiring any assets to be deposited.
     */
    function mint(uint256 _shares, address _receiver) public override returns (uint256) {
        require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");

        uint256 assets = previewMint(_shares);
        require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");
        _deposit(_msgSender(), _receiver, assets, _shares);

        return assets;
    }

    /** @dev See {IERC4626-withdraw}. */
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        require(_assets <= maxWithdraw(_owner), "ERC4626: withdraw more than max");

        uint256 shares = previewWithdraw(_assets);
        _withdraw(_msgSender(), _receiver, _owner, _assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        require(_shares <= maxRedeem(_owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(_shares);
        _withdraw(_msgSender(), _receiver, _owner, assets, _shares);

        return assets;
    }

    /**
     * @dev Deposit/mint common workflow.
     */
    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal override {
        IERC20 auroraToken = IERC20(asset());
        IStakingManager manager = IStakingManager(stakingManager);
        auroraToken.safeTransferFrom(_caller, address(this), _assets);

        address depositor = manager.nextDepositor();
        auroraToken.safeIncreaseAllowance(depositor, _assets);
        IDepositor(depositor).stake(_assets);
        manager.setNextDepositor();

        _mint(_receiver, _shares);

        emit Deposit(_caller, _receiver, _assets, _shares);
    }

    /**
     * @dev Withdraw/redeem common workflow.
     */
    function _withdraw(
        address _caller,
        address _receiver,
        address _owner,
        uint256 _assets,
        uint256 _shares
    ) internal override {
        if (_caller != _owner) {
            _spendAllowance(_owner, _caller, _shares);
        }

        // IMPORTANT!!! IF this withdraw will only works with delayed unstake, then
        // the burn is already made by the staking manager.
        // _burn(owner, shares);

        IStakingManager(stakingManager).transferAurora(_receiver, _owner, _assets);

        emit Withdraw(_caller, _receiver, _owner, _assets, _shares);
    }

    function burn(address _owner, uint256 _shares) external onlyManager {
        _burn(_owner, _shares);
    }
}
