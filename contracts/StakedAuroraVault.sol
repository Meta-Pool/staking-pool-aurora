// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool stAUR 🪐 vault contract.

import "./interfaces/IDepositor.sol";
import "./interfaces/ILiquidityPool.sol";
import "./interfaces/IStakedAuroraVaultEvents.sol";
import "./interfaces/IStakingManager.sol";
import "./utils/FullyOperational.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

// NOTE: SafeMath is no longer needed starting with Solidity 0.8. The compiler now has
// built in overflow checking.

/// @notice [FullyOperational] When is NOT fully operational, users cannot:
/// 1) mint, 2) deposit nor 3) create withdraw orders.

/// @notice [Whitelistable] removed for v0.2. Mainnet stAUR token is NOT whitelistable.

contract StakedAuroraVault is
    FullyOperational,
    ERC4626,
    AccessControl,
    IStakedAuroraVaultEvents
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IStakingManager public stakingManager;
    ILiquidityPool public liquidityPool;
    uint256 public minDepositAmount;

    modifier onlyManager() {
        if (msg.sender != address(stakingManager)) { revert Unauthorized(); }
        _;
    }

    constructor(
        uint256 _minDepositAmount,
        address _contractOperatorRole,
        IERC20 _asset,
        string memory _stAurName,
        string memory _stAurSymbol
    )
        ERC4626(_asset)
        ERC20(_stAurName, _stAurSymbol)
    {
        if (address(_asset) == address(0) || _contractOperatorRole == address(0)) {
            revert InvalidZeroAddress();
        }
        minDepositAmount = _minDepositAmount;

        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, _contractOperatorRole);
    }

    receive() external payable {}

    // *******************
    // * Admin functions *
    // *******************

    function initializeLiquidStaking(
        IStakingManager _stakingManager,
        ILiquidityPool _liquidityPool
    ) external onlyRole(ADMIN_ROLE) {
        if (address(liquidityPool) != address(0)
                || address(stakingManager) != address(0)) {
            revert ContractAlreadyInitialized();
        }
        if (address(_stakingManager) == address(0)
                || address(_liquidityPool) == address(0)) {
            revert InvalidZeroAddress();
        }

        stakingManager = _stakingManager;
        liquidityPool = _liquidityPool;

        // Get fully operational for the first time.
        updateContractOperation(true);

        emit ContractInitialized(
            address(_stakingManager),
            address(_liquidityPool),
            msg.sender
        );
    }

    /// @dev In case of emergency 🛟, update the Manager contract.
    function updateStakingManager(
        IStakingManager _stakingManager
    ) external onlyRole(ADMIN_ROLE) {
        if (address(_stakingManager) == address(0)) { revert InvalidZeroAddress(); }
        if (address(stakingManager) == address(0)) { revert ContractNotInitialized(); }
        stakingManager = _stakingManager;

        emit NewManagerUpdate(address(_stakingManager), msg.sender);
    }

    function updateLiquidityPool(
        ILiquidityPool _liquidityPool
    ) external onlyRole(ADMIN_ROLE) {
        if (address(_liquidityPool) == address(0)) { revert InvalidZeroAddress(); }
        if (address(liquidityPool) == address(0)) { revert ContractNotInitialized(); }
        liquidityPool = _liquidityPool;

        emit NewLiquidityPoolUpdate(address(_liquidityPool), msg.sender);
    }

    function updateMinDepositAmount(uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        minDepositAmount = _amount;

        emit UpdateMinDepositAmount(_amount, msg.sender);
    }

    /// @notice Use in case of emergency 🦺.
    /// @dev Check if the contract is initialized when the change is to true.
    function updateContractOperation(
        bool _isFullyOperational
    ) public override onlyRole(ADMIN_ROLE) {
        if (_isFullyOperational
                && (address(liquidityPool) == address(0)
                        || address(stakingManager) == address(0))) {
            revert ContractNotInitialized();
        }
        fullyOperational = _isFullyOperational;

        emit ContractUpdateOperation(_isFullyOperational, msg.sender);
    }

    function getStAurPrice() public view returns (uint256) {
        uint256 ONE_AURORA = 1 ether;
        return convertToAssets(ONE_AURORA);
    }

    /// @notice The total assets are the sum of the balance from all Depositors.
    function totalAssets() public view override returns (uint256) {
        return IStakingManager(stakingManager).totalAssets();
    }

    // ******************
    // * Core functions *
    // ******************

    /// @dev Same as ERC-4626, but adding evaluation of min deposit amount.
    function deposit(
        uint256 _assets,
        address _receiver
    ) public override onlyFullyOperational returns (uint256) {
        if (_assets < minDepositAmount) { revert LessThanMinDeposit(); }
        require(_assets <= maxDeposit(_receiver), "ERC4626: deposit more than max");

        uint256 shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, shares);

        return shares;
    }

    function mint(
        uint256 _shares,
        address _receiver
    ) public override onlyFullyOperational returns (uint256) {
        uint256 assets = previewMint(_shares);
        if (assets < minDepositAmount) { revert LessThanMinDeposit(); }
        require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");
        _deposit(msg.sender, _receiver, assets, _shares);

        return assets;
    }

    /// @notice Delay-unstake process starts from either the withdraw or redeem function.
    /// After the cooling period, funds can be collected using completeDelayUnstake().
    /// @dev Starts the delay-unstake.
    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) public override onlyFullyOperational returns (uint256) {
        if (_assets == 0) { revert InvalidZeroAmount(); }
        require(_assets <= maxWithdraw(_owner), "ERC4626: withdraw more than max");

        uint256 shares = previewWithdraw(_assets);
        _withdraw(msg.sender, _receiver, _owner, _assets, shares);

        return shares;
    }

    /// @notice The redeem fn starts the release of tokens from the Aurora Plus contract.
    /// @dev Starts the delay-unstake.
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override onlyFullyOperational returns (uint256) {
        if (_shares == 0) { revert InvalidZeroAmount(); }
        require(_shares <= maxRedeem(_owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(_shares);
        _withdraw(msg.sender, _receiver, _owner, assets, _shares);

        return assets;
    }

    /// @notice It can only be called after the withdraw/redeem of the stAUR and the
    /// waiting period.
    function completeDelayUnstake(
        uint256 _assets,
        address _receiver
    ) public {
        // The transfer is settled only if the msg.sender has enough available funds in
        // the manager contract.
        IStakingManager(stakingManager).transferAurora(_receiver, msg.sender, _assets);

        emit Withdraw(msg.sender, _receiver, msg.sender, _assets, 0);
    }

    // **********************
    // * Treasury functions *
    // **********************

    function mintFee(address _treasury, uint256 _fee) public onlyManager {
        _mint(_treasury, _fee);
    }

    // *********************
    // * Private functions *
    // *********************

    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal override {
        IERC20 auroraToken = IERC20(asset());
        IStakingManager manager = IStakingManager(stakingManager);
        auroraToken.safeTransferFrom(_caller, address(this), _assets);
        ILiquidityPool _pool = liquidityPool;

        // FLOW 1: Use the stAUR in the Liquidity Pool.
        if (_pool.isStAurBalanceAvailable(_shares)) {
            auroraToken.safeIncreaseAllowance(address(_pool), _assets);
            _pool.transferStAur(_receiver, _shares, _assets);

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

        _burn(_owner, _shares);
        IStakingManager(stakingManager).createWithdrawOrder(_assets, _receiver);

        emit Withdraw(msg.sender, _receiver, _owner, _shares, _assets);
    }
}