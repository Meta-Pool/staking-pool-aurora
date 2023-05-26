// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/ILiquidityPool.sol";
import "./interfaces/IStakedAuroraVault.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/// @notice Liquidity Pool that allows the fast convertion of stAUR to AURORA tokens.

contract LiquidityPool is ERC4626, AccessControl, ILiquidityPool {
    using SafeERC20 for IERC20;
    using SafeERC20 for IStakedAuroraVault;

    /// @dev 100% represented as Basis Points.
    uint256 public constant ONE_HUNDRED_PERCENT = 10_000;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev Contract addresses of the stAUR vault and the AURORA token.
    address immutable public stAurVault;
    address immutable public auroraToken;

    /// @dev Internal accounting for the two vault assets.
    uint256 public stAurBalance;
    uint256 public auroraBalance;
    uint256 public minDepositAmount;

    /// @dev Fee is represented as Basis Points (100 points == 1.00%).
    uint256 public swapFeeBasisPoints;

    /// @dev How much of the Swap Fee, the liquidity providers will keep.
    uint256 public liqProvFeeCutBasisPoints;

    /// @dev The remaining Fees will be available to be collected by Meta Pool.
    uint256 public collectedStAurFees;

    bool public fullyOperational;

    modifier onlyStAurVault() {
        if (msg.sender != stAurVault) { revert Unauthorized(); }
        _;
    }

    modifier onlyFullyOperational() {
        if (!fullyOperational) { revert NotFullyOperational(); }
        _;
    }

    modifier checkBasisPoints(uint256 _basisPoints) {
        if (_basisPoints > ONE_HUNDRED_PERCENT) { revert InvalidBasisPoints(); }
        _;
    }

    constructor(
        address _stAurVault,
        address _auroraToken,
        address _feeCollectorRole,
        address _contractOperatorRole,
        string memory _lpTokenName,
        string memory _lpTokenSymbol,
        uint256 _minDepositAmount,
        uint256 _swapFeeBasisPoints,
        uint256 _liqProvFeeCutBasisPoints
    )
        ERC4626(IERC20(_auroraToken))
        ERC20(_lpTokenName, _lpTokenSymbol)
        checkBasisPoints(_swapFeeBasisPoints)
        checkBasisPoints(_liqProvFeeCutBasisPoints)
    {
        if (_stAurVault == address(0)
                || _auroraToken == address(0)
                || _feeCollectorRole == address(0)
                || _contractOperatorRole == address(0)) { revert InvalidZeroAddress(); }
        stAurVault = _stAurVault;
        auroraToken = _auroraToken;
        minDepositAmount = _minDepositAmount;
        swapFeeBasisPoints = _swapFeeBasisPoints;
        liqProvFeeCutBasisPoints = _liqProvFeeCutBasisPoints;
        fullyOperational = true;

        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_COLLECTOR_ROLE, _feeCollectorRole);
        _grantRole(OPERATOR_ROLE, _contractOperatorRole);
    }

    receive() external payable {}

    function updateMinDepositAmount(
        uint256 _amount
    ) external onlyRole(OPERATOR_ROLE) {
        minDepositAmount = _amount;

        emit UpdateMinDepositAmount(_amount, msg.sender);
    }

    function updateFeeBasisPoints(
        uint256 _feeBasisPoints
    ) external onlyRole(OPERATOR_ROLE) checkBasisPoints(_feeBasisPoints) {
        swapFeeBasisPoints = _feeBasisPoints;

        emit UpdateFeeBasisPoints(_feeBasisPoints, msg.sender);
    }

    function updateLiqProvFeeBasisPoints(
        uint256 _feeBasisPoints
    ) external onlyRole(OPERATOR_ROLE) checkBasisPoints(_feeBasisPoints) {
        liqProvFeeCutBasisPoints = _feeBasisPoints;

        emit UpdateLiqProvFeeBasisPoints(_feeBasisPoints, msg.sender);
    }

    /// @notice Use in case of emergency 🦺, stops: 1) adding and removing
    /// liquidity, 2) all swaps from stAUR to AURORA tokens and 3) providing
    /// stAUR token liquidity to cover deposits (FLOW 1).
    function updateContractOperation(
        bool _isFullyOperational
    ) public onlyRole(ADMIN_ROLE) {
        fullyOperational = _isFullyOperational;

        emit ContractUpdateOperation(_isFullyOperational, msg.sender);
    }

    /// @notice Function to evaluate if a Vault deposit can be covered by the
    /// balance of stAUR tokens in the Liquidity Pool.
    function isStAurBalanceAvailable(uint256 _amount) external view returns(bool) {
        return (stAurBalance >= _amount) && fullyOperational;
    }

    /// @notice The stAUR Vault will emit the Deposit event if this function runs.
    /// @dev This function will ONLY be called by the stAUR vault
    /// to cover Aurora deposits (FLOW 1).
    function transferStAur(
        address _receiver,
        uint256 _amount,
        uint256 _assets
    ) external onlyStAurVault {
        stAurBalance -= _amount;
        address _stAurVault = stAurVault;
        IStakedAuroraVault(_stAurVault).safeTransfer(_receiver, _amount);
        auroraBalance += _assets;
        IERC20(auroraToken).safeTransferFrom(_stAurVault, address(this), _assets);

        emit StAurLiquidityProvidedByPool(_receiver, _amount, _assets);
    }
    
    /// @dev Calculate sum of AURORA and stAUR balance, converting the amount of
    /// stAUR to AURORA using the Vault price.
    /// @return _amount Denominated in AURORA tokens.
    function totalAssets() public view override returns (uint256) {
        return (
            auroraBalance
                + IStakedAuroraVault(stAurVault).convertToAssets(stAurBalance)
        );
    }

    /// @notice The deposit flow is used to **Add** liquidity to the Liquidity Pool.
    function deposit(
        uint256 _assets,
        address _receiver
    ) public override onlyFullyOperational returns (uint256) {
        if (_assets < minDepositAmount) { revert LessThanMinDeposit(); }

        uint256 _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);

        return _shares;
    }

    /// @notice Front-end can preview the amount that will be redeemed.
    function calculatePreviewRedeem(uint256 _shares) public view returns (uint256, uint256) {
        // Core Calculations.
        uint256 ONE_AURORA = 1 ether;
        uint256 poolPercentage = (_shares * ONE_AURORA) / totalSupply();
        uint256 auroraToSend = (poolPercentage * auroraBalance) / ONE_AURORA;
        uint256 stAurToSend = (poolPercentage * stAurBalance) / ONE_AURORA;

        return (auroraToSend, stAurToSend);
    }

    /// @notice The redeem flow is used to **Remove** liquidity from the Liquidity Pool.
    /// @return ONLY the amount of base assets (AURORA token) that will be returned.
    /// However, the liquidity provider expects to receive stAUR tokens as well,
    /// in proportion of the redeemed shares.
    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override onlyFullyOperational returns (uint256) {
        if (_shares == 0) { revert InvalidZeroAmount(); }
        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, _shares);
        }
        (uint256 _auroraToSend, uint256 _stAurToSend) = calculatePreviewRedeem(_shares);

        auroraBalance -= _auroraToSend;
        stAurBalance -= _stAurToSend;

        // IMPORTANT NOTE: run the burn 🔥 AFTER the calculations.
        _burn(msg.sender, _shares);

        // Send Aurora tokens.
        IERC20(asset()).safeTransfer(_receiver, _auroraToSend);

        // Then, send stAUR tokens.
        IStakedAuroraVault(stAurVault).safeTransfer(_receiver, _stAurToSend);

        emit RemoveLiquidity(
            msg.sender,
            _receiver,
            _owner,
            _shares,
            _auroraToSend,
            _stAurToSend
        );
        return _auroraToSend;
    }

    /// @dev Use deposit fn instead.
    function mint(uint256, address) public override pure returns (uint256) {
        revert UnavailableFunction();
    }

    /// @dev Use redeem fn instead.
    function withdraw(uint256, address, address) public override pure returns (uint256) {
        revert UnavailableFunction();
    }

    /// @param _amount Denominated in stAUR.
    /// @return _auroraAmount Denominated in AURORA.
    function previewSwapStAurForAurora(uint256 _amount) external view returns (uint256) {
        (uint256 _discountedAmount,,) = _calculatePoolFees(_amount);
        return IStakedAuroraVault(stAurVault).convertToAssets(_discountedAmount);
    }

    /// @notice Function that allows "fast unstake".
    /// @param _stAurAmount Denominated in stAUR.
    /// @param _minAuroraToReceive Min amount of AURORA tokens that the user is expecting,
    /// get a value for this parameter using the function previewSwapStAurForAurora().
    function swapStAurForAurora(
        uint256 _stAurAmount,
        uint256 _minAuroraToReceive
    ) external onlyFullyOperational {
        if (_stAurAmount == 0) { revert InvalidZeroAmount(); }
        (
            uint256 _discountedAmount,
            uint256 _collectedFee,
            uint256 _lpFeeCut
        ) = _calculatePoolFees(_stAurAmount);

        IStakedAuroraVault vault = IStakedAuroraVault(stAurVault);
        uint256 auroraToSend = vault.convertToAssets(_discountedAmount);

        if (auroraToSend > auroraBalance) { revert NotEnoughBalance(); }
        if (auroraToSend < _minAuroraToReceive) { revert SlippageError(); }

        stAurBalance += (_discountedAmount + _lpFeeCut);
        collectedStAurFees += _collectedFee;
        auroraBalance -= auroraToSend;

        // Step 1. Get the caller stAUR tokens.
        vault.safeTransferFrom(msg.sender, address(this), _stAurAmount);

        // Step 2. Transfer the Aurora tokens to the caller.
        IERC20(auroraToken).safeTransfer(msg.sender, auroraToSend);

        emit SwapStAur(
            msg.sender,
            auroraToSend,
            _stAurAmount,
            _collectedFee + _lpFeeCut
        );
    }

    /// @notice The collected stAUR fees are owned by Meta Pool.
    function withdrawCollectedStAurFees(
        address _receiver
    ) onlyRole(FEE_COLLECTOR_ROLE) external {
        uint256 _toTransfer = collectedStAurFees;
        collectedStAurFees = 0;
        IStakedAuroraVault(stAurVault).safeTransfer(_receiver, _toTransfer);

        emit WithdrawCollectedFees(_receiver, _toTransfer, msg.sender);
    }

    /// @notice The fee is splited in two: first, for the Liquidity Providers, and
    /// second, for Meta Pool, granted for FEE_COLLECTOR_ROLE.
    /// @dev CONSIDER FORMULA: _discountedAmount + _collectedFee + _lpFeeCut == _amount
    /// @return _discountedAmount stAUR to be taken from the pool to cover the swap.
    /// @return _collectedFee stAUR to be granted for FEE_COLLECTOR_ROLE.
    /// @return _lpFeeCut stAUR for our friends, the Liquidity Providers.
    function _calculatePoolFees(
        uint256 _amount
    ) private view returns (uint256, uint256, uint256) {
        uint256 totalFee = (
            _amount * swapFeeBasisPoints
        ) / ONE_HUNDRED_PERCENT;

        // The cut of the fee destinated to the Liquidity Providers.
        uint256 _lpFeeCut = (
            totalFee * liqProvFeeCutBasisPoints
        ) / ONE_HUNDRED_PERCENT;

        return (_amount - totalFee, totalFee - _lpFeeCut, _lpFeeCut);
    }

    /// @dev The Deposit event is used to indicate more liquidity.
    function _deposit(
        address _caller,
        address _receiver,
        uint256 _assets,
        uint256 _shares
    ) internal virtual override {
        auroraBalance += _assets;
        IERC20(asset()).safeTransferFrom(_caller, address(this), _assets);
        _mint(_receiver, _shares);

        emit AddLiquidity(_caller, _receiver, _assets, _shares);
    }
}