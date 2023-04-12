// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IDepositor.sol";
import "./interfaces/ILiquidityPool.sol";
import "./interfaces/IStakingManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

// import "hardhat/console.sol";

// NOTE: SafeMath is no longer needed starting with Solidity 0.8. The compiler now has built in overflow checking.

contract StakedAuroraVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    address[] public legacyStakingManagers;
    address[] public legacyLiquidityPools;

    address public stakingManager;
    address public liquidityPool;
    uint256 public minDepositAmount;

    /// @notice When is NOT fully operational, users cannot:
    /// @notice 1) mint, 2) deposit nor 3) create withdraw orders.
    bool public fullyOperational;
    bool public enforceWhitelist;

    mapping(address => bool) public accountWhitelist;

    modifier onlyManager() {
        require(stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        require(_msgSender() == stakingManager, "ONLY_STAKING_MANAGER");
        _;
    }

    modifier onlyFullyOperational() {
        require(fullyOperational, "CONTRACT_IS_NOT_FULLY_OPERATIONAL");
        _;
    }

    modifier checkWhitelist() {
        if (enforceWhitelist) {
            require(accountWhitelist[_msgSender()], "ACCOUNT_IS_NOT_WHITELISTED");
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
        fullyOperational = false;
        enforceWhitelist = true;
    }

    function initializeStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        require(stakingManager == address(0), "ALREADY_INITIALIZED");

        // Get fully operational for the first time.
        if (liquidityPool != address(0)) { fullyOperational = true; }
        stakingManager = _stakingManager;
    }

    function initializeLiquidityPool(address _liquidityPool) external onlyOwner {
        require(_liquidityPool != address(0), "INVALID_ZERO_ADDRESS");
        require(liquidityPool == address(0), "ALREADY_INITIALIZED");

        // Get fully operational for the first time.
        if (stakingManager != address(0)) { fullyOperational = true; }
        liquidityPool = _liquidityPool;
    }

    function updateStakingManager(address _stakingManager) external onlyOwner {
        require(_stakingManager != address(0), "INVALID_ZERO_ADDRESS");
        require(stakingManager != address(0), "NOT_INITIALIZED");

        legacyStakingManagers.push(stakingManager);
        stakingManager = _stakingManager;
    }

    function updateLiquidityPool(address _liquidityPool) external onlyOwner {
        require(_liquidityPool != address(0), "INVALID_ZERO_ADDRESS");
        require(liquidityPool != address(0), "NOT_INITIALIZED");

        legacyLiquidityPools.push(liquidityPool);
        liquidityPool = _liquidityPool;
    }

    function updateMinDepositAmount(uint256 _amount) external onlyOwner {
        minDepositAmount = _amount;
    }

    /// @notice Use in case of emergency 🦺.
    function toggleFullyOperational() external onlyOwner {
        require(liquidityPool != address(0) && stakingManager != address(0), "CONTRACT_NOT_INITIALIZED");
        fullyOperational = !fullyOperational;
    }

    function toggleEnforceWhitelist() external onlyOwner {
        enforceWhitelist = !enforceWhitelist;
    }

    function whitelistAccount(address _account) external onlyOwner {
        accountWhitelist[_account] = true;
    }

    function blacklistAccount(address _account) external onlyOwner {
        accountWhitelist[_account] = false;
    }

    function getStAurPrice() public view returns (uint256) {
        return convertToAssets(1 ether);
    }

    function totalAssets() public view override returns (uint256) {
        if (liquidityPool == address(0) || stakingManager == address(0)) return 0;
        return IStakingManager(stakingManager).totalAssets();
    }

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

    /// @dev It can only be called after the redeem of the stAUR and the waiting period.
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        uint256 shares = previewWithdraw(_assets);
        _withdraw(_msgSender(), _receiver, _owner, _assets, shares);

        return shares;
    }

    /// @dev The redeem fn starts the release of tokens from the Aurora staking contract.
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override onlyFullyOperational returns (uint256) {
        // TODO: ⛔ This might be a solution for the allowance. But please test it.
        if (_msgSender() != _owner) {
            _spendAllowance(_owner, _msgSender(), _shares);
        }

        // IMPORTANT NOTE: run the _burn fn after the asset calculation.
        uint256 assets = previewRedeem(_shares);
        _burn(_owner, _shares);

        IStakingManager(stakingManager).createWithdrawOrder(assets, _receiver);

        return assets;
    }

    /// @dev Only called when the withdraw orders are cleared for emergency.
    function emergencyMintRecover(
        address _receiver,
        uint256 _assets
    ) external onlyManager {
        uint256 shares = previewDeposit(_assets);
        _mint(_receiver, shares);
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
        if (pool.isAvailable(_shares)) {
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

        IStakingManager(stakingManager).transferAurora(_receiver, _owner, _assets);

        emit Withdraw(_caller, _receiver, _owner, _assets, _shares);
    }
}