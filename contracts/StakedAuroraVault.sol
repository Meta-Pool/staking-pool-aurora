// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IDepositor.sol";
import "./interfaces/ILiquidityPool.sol";
import "./interfaces/IStakingManager.sol";
import "./interfaces/IStakedAuroraVaultEvents.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

// NOTE: SafeMath is no longer needed starting with Solidity 0.8. The compiler now has built in overflow checking.

contract StakedAuroraVault is ERC4626, Ownable, IStakedAuroraVaultEvents {
    using SafeERC20 for IERC20;

    address public stakingManager;
    address public liquidityPool;
    uint256 public minDepositAmount;

    /// @notice When is NOT fully operational, users cannot:
    /// @notice 1) mint, 2) deposit nor 3) create withdraw orders.
    bool public fullyOperational;
    bool public enforceWhitelist;

    mapping(address => bool) public accountWhitelist;

    modifier onlyManager() {
        require(_msgSender() == stakingManager, "ONLY_STAKING_MANAGER");
        _;
    }

    modifier onlyFullyOperational() {
        require(fullyOperational, "CONTRACT_IS_NOT_FULLY_OPERATIONAL");
        _;
    }

    modifier checkWhitelist() {
        if (enforceWhitelist) {
            require(isWhitelisted(_msgSender()), "ACCOUNT_IS_NOT_WHITELISTED");
        }
        _;
    }

    constructor(
        address _asset,
        string memory _stAurName,
        string memory _stAurSymbol,
        uint256 _minDepositAmount
    )
        ERC4626(IERC20(_asset))
        ERC20(_stAurName, _stAurSymbol)
    {
        require(_asset != address(0), "INVALID_ZERO_ADDRESS");
        minDepositAmount = _minDepositAmount;
        enforceWhitelist = true;
    }

    function initializeLiquidStaking(
        address _stakingManager,
        address _liquidityPool
    ) external onlyOwner {
        require(liquidityPool == address(0) || stakingManager == address(0), "ALREADY_INITIALIZED");
        require(_liquidityPool != address(0) || _stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        stakingManager = _stakingManager;
        liquidityPool = _liquidityPool;

        // Get fully operational for the first time.
        updateContractOperation(true);
        emit ContractInitialized(_msgSender(), _stakingManager, _liquidityPool);
    }

    function updateStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        require(stakingManager != address(0), "NOT_INITIALIZED");

        emit NewManagerUpdate(_msgSender(), stakingManager, _stakingManager);
        stakingManager = _stakingManager;
    }

    function updateLiquidityPool(address _liquidityPool) external onlyOwner {
        require(_liquidityPool != address(0), "INVALID_ZERO_ADDRESS");
        require(liquidityPool != address(0), "NOT_INITIALIZED");

        emit NewLiquidityPoolUpdate(_msgSender(), liquidityPool, _liquidityPool);
        liquidityPool = _liquidityPool;
    }

    function updateMinDepositAmount(uint256 _amount) external onlyOwner {
        minDepositAmount = _amount;
    }

    /// @notice Use in case of emergency 🦺.
    /// @dev Check if the contract is initialized when the change is to true.
    function updateContractOperation(bool _isFullyOperational) public onlyOwner {
        if (_isFullyOperational) {
            require(
                liquidityPool != address(0) && stakingManager != address(0),
                "CONTRACT_NOT_INITIALIZED"
            );
        }
        fullyOperational = _isFullyOperational;
        emit ContractUpdateOperation(_msgSender(), _isFullyOperational);
    }

    function updateEnforceWhitelist(bool _isWhitelistRequired) external onlyOwner {
        enforceWhitelist = _isWhitelistRequired;
        emit ContractUpdateWhitelist(_msgSender(), _isWhitelistRequired);
    }

    function whitelistAccount(address _account) external onlyOwner {
        accountWhitelist[_account] = true;
        emit AccountWhitelisted(_msgSender(), _account);
    }

    function blacklistAccount(address _account) external onlyOwner {
        accountWhitelist[_account] = false;
        emit AccountBlacklisted(_msgSender(), _account);
    }

    function isWhitelisted(address _account) public view returns (bool) {
        return accountWhitelist[_account];
    }

    function getStAurPrice() public view returns (uint256) {
        uint256 ONE_AURORA = 1 ether;
        return convertToAssets(ONE_AURORA);
    }

    function totalAssets() public view override returns (uint256) {
        return IStakingManager(stakingManager).totalAssets();
    }

    /// @dev Same as ERC-4626, but adding evaluation of min deposit amount.
    function deposit(
        uint256 _assets,
        address _receiver
    ) public override onlyFullyOperational checkWhitelist returns (uint256) {
        require(_assets <= maxDeposit(_receiver), "ERC4626: deposit more than max");
        require(_assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");

        uint256 shares = previewDeposit(_assets);
        _deposit(_msgSender(), _receiver, _assets, shares);

        return shares;
    }

    function mint(
        uint256 _shares,
        address _receiver
    ) public override onlyFullyOperational checkWhitelist returns (uint256) {
        require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");

        uint256 assets = previewMint(_shares);
        require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");
        _deposit(_msgSender(), _receiver, assets, _shares);

        return assets;
    }

    /// @notice It can only be called after the redeem of the stAUR and the waiting period.
    /// @dev The withdraw can only be run by the owner, that's why the 3rd param is not required.
    /// @return Zero shares were burned during the withdraw.
    function withdraw(
        uint256 _assets,
        address _receiver,
        address
    ) public override returns (uint256) {
        IStakingManager(stakingManager).transferAurora(_receiver, _msgSender(), _assets);

        emit Withdraw(_msgSender(), _receiver, _msgSender(), _assets, 0);

        return 0;
    }

    /// @notice The redeem fn starts the release of tokens from the Aurora staking contract.
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override onlyFullyOperational returns (uint256) {
        require(_shares > 0, "CANNOT_REDEEM_ZERO_SHARES");
        if (_msgSender() != _owner) {
            _spendAllowance(_owner, _msgSender(), _shares);
        }

        // IMPORTANT NOTE: run the burn 🔥 AFTER the calculations.
        uint256 assets = previewRedeem(_shares);
        _burn(_owner, _shares);

        IStakingManager(stakingManager).createWithdrawOrder(assets, _receiver);

        emit WithdrawOrderCreated(_msgSender(), _receiver, _owner, _shares, assets);

        return assets;
    }

    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal override {
        IERC20 auroraToken = IERC20(asset());
        IStakingManager manager = IStakingManager(stakingManager);
        auroraToken.safeTransferFrom(_caller, address(this), _assets);
        ILiquidityPool pool = ILiquidityPool(liquidityPool);

        // FLOW 1: Use the stAUR in the Liquidity Pool.
        if (pool.isStAurBalanceAvailable(_shares)) {
            auroraToken.safeIncreaseAllowance(liquidityPool, _assets);
            pool.transferStAur(_receiver, _shares, _assets);
        // FLOW 2: Stake with the depositor to mint more stAUR.
        } else {
            address depositor = manager.nextDepositor();
            auroraToken.safeIncreaseAllowance(depositor, _assets);
            IDepositor(depositor).stake(_assets);
            manager.setNextDepositor();

            _mint(_receiver, _shares);
        }

        emit Deposit(_caller, _receiver, _assets, _shares);
    }
}