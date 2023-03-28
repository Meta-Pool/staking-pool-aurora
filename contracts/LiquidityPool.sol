// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./interfaces/IStakedAuroraVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

// import "hardhat/console.sol";

contract LiquidityPool is ERC4626, Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for IStakedAuroraVault;

    address public stAurVault;
    address public auroraToken;

    uint256 public stAurBalance;
    uint256 public auroraBalance;

    // address public stakingManager;
    uint256 public minimumLiquidity;
    uint256 public minDepositAmount;
    // // Check if a treasury is needed
    // address public treasury;

    // BASIS POINTS
    // uint16 public constant MIN_FEE = 30;
    // uint16 public constant MAX_FEE = 500;
    uint256 public swapFeeBasisPoints;
    uint256 public colledtedStAurFees;
    uint128 private constant ONE_AURORA = 1 ether;

    event AddLiquidity(
        address indexed user,
        address indexed receiver,
        uint amount,
        uint shares
    );
    event RemoveLiquidity(
        address indexed user,
        uint shares,
        uint aurora,
        uint stAurVault
    );
    event Swap(address indexed user, uint amountIn, uint amountOut, uint fees);

    modifier validDeposit(uint _amount) {
        _checkDeposit(_amount);
        _;
    }

    modifier onlyStAurVault() {
        require(msg.sender == stAurVault, "ONLY_FOR_STAUR_VAULT");
        _;
    }

    constructor(
        address _stAurVault,
        address _auroraToken,
        string memory _lpTokenName,
        string memory _lpTokenSymbol,
        uint256 _minDepositAmount,
        uint256 _swapFeeBasisPoints
    )
        ERC4626(IERC20(_auroraToken))
        ERC20(_lpTokenName, _lpTokenSymbol)
    {
        require(_stAurVault != address(0), "INVALID_ZERO_ADDRESS");
        require(_auroraToken != address(0), "INVALID_ZERO_ADDRESS");
        stAurVault = _stAurVault;
        auroraToken = _auroraToken;
        minDepositAmount = _minDepositAmount;
        swapFeeBasisPoints = _swapFeeBasisPoints;
        // stAurBalance = 0;
        // auroraBalance = 0;
    }

    receive() external payable {}

    function updateMinimumLiquidity(uint256 _amount) external onlyOwner {
        minimumLiquidity = _amount;
    }

    function transferStAur(address _receiver, uint256 _amount) external onlyStAurVault returns (bool) {
        if (stAurBalance >= _amount) {
            stAurBalance -= _amount;
            IStakedAuroraVault vault = IStakedAuroraVault(stAurVault);
            // TODO: ⚠️ WARNING! is there a way to do this transfer in a safer way?
            vault.transfer(_receiver, _amount);
            return true;
        } else {
            return false;
        }
    }

    function getAuroraFromVault(uint256 _assets) external onlyStAurVault {
        auroraBalance += _assets;
        IERC20 aurora = IERC20(auroraToken);
        aurora.safeTransferFrom(stAurVault, address(this), _assets);
    }

    /// @notice Return the amount of stAur and Aurora equivalent to Aurora in the pool
    function totalAssets() public view override returns (uint) {
        return
            auroraBalance +
            // TODO: Change this for stAurBalance!!!!!!!
            IStakedAuroraVault(stAurVault).convertToAssets(
                IStakedAuroraVault(stAurVault).balanceOf(address(this))
            );
    }

    // TODO: WARINING ⚠️
    function deposit(
        uint _assets,
        address _receiver
    ) public override validDeposit(_assets) returns (uint) {
        // shares cannot be calculate without considering the 2 assets.
        uint _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);
        return _shares;
    }

    function mint(uint256 _shares, address _receiver) public override returns (uint256) {
        revert("USE deposit()");
        // require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");

        // uint256 assets = previewMint(_shares);
        // require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");
        // _deposit(_msgSender(), _receiver, assets, _shares);

        // return assets;
    }

    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        revert("USE redeem()");
        // // TODO: ⛔ This flow is untested for withdraw and redeem. Test allowance.
        // // By commenting out, we are running the test for 3rd party withdraw.
        // // if (_owner != _msgSender()) require(false, "UNTESTED_ALLOWANCE_FOR_WITHDRAW");

        // // console.log("Assets: %s", _assets);
        // // console.log("max wi: %s", maxWithdraw(_owner));

        // // TODO: ⛔ No require is being performed here! Please confirm it's safe!
        // // require(_assets <= maxWithdraw(_owner), "ERC4626: withdraw more than max");

        // // console.log("1. assets %s <> %s", _assets, 0);
        // uint256 shares = previewWithdraw(_assets);
        // // console.log("2. shares %s <> %s", shares, 0);
        // // console.log("alice: %s", _owner);
        // _withdraw(_msgSender(), _receiver, _owner, _assets, shares);
        // // console.log("3. assets and shares %s <> %s", shares, 0);

        // return shares;
    }

    function redeem(
        uint _shares,
        address _receiver,
        address _owner
    ) public virtual override returns (uint) {
        if (msg.sender != _owner) {
            _spendAllowance(_owner, msg.sender, _shares);
        }
        uint poolPercentage = (_shares * ONE_AURORA) / totalSupply();
        uint auroraToSend = (poolPercentage * auroraBalance) / ONE_AURORA;
        uint stAuroraToSend = (poolPercentage *
            IStakedAuroraVault(stAurVault).balanceOf(address(this))) / ONE_AURORA;
        _burn(msg.sender, _shares);
        IERC20(asset()).safeTransfer(_receiver, auroraToSend);

        // stAurVault is using two interfaces???? IStakedAuroraVault and IERC20
        IERC20(stAurVault).safeTransfer(_receiver, stAuroraToSend);
        auroraBalance -= auroraToSend;
        emit RemoveLiquidity(msg.sender, _shares, auroraToSend, stAuroraToSend);
        return auroraToSend;
    }

    function previewSwapStAurForAurora(uint256 _amount) external view returns (uint256) {
        (uint256 discountedAmount,) = _calculatePoolFees(_amount);
        return IStakedAuroraVault(stAurVault).convertToAssets(discountedAmount);
    }

    function swapStAurforAurora(
        uint256 _amount,
        uint256 _minAuroraToReceive
    ) external {
        IStakedAuroraVault vault = IStakedAuroraVault(stAurVault);
        (uint256 discountedAmount, uint256 fee) = _calculatePoolFees(_amount);
        uint256 auroraToSend = vault.convertToAssets(discountedAmount);

        require(auroraToSend <= auroraBalance, "NOT_ENOUGH_AURORA");
        require(auroraToSend >= _minAuroraToReceive, "UNREACHED_MIN_SWAP_AMOUNT");

        stAurBalance += discountedAmount;
        colledtedStAurFees += fee;
        auroraBalance -= auroraToSend;

        // Step 1. Get the caller stAur tokens.
        vault.safeTransferFrom(msg.sender, address(this), _amount);

        // Step 2. Transfer the Aurora tokens to the caller.
        IERC20(auroraToken).safeTransfer(msg.sender, auroraToSend);

        emit Swap(msg.sender, _amount, auroraToSend, fee);
    }

    // TODO: instead of StAurora use StAur.
    // ⚠️ Increase the stAurBalance!!!
    // DEPRECATED! see above.
    function swapStAuroraforAurora(
        uint _amount,
        uint _minReceived
    ) external returns (uint) {
        // uint16 feeRange = MAX_FEE - MIN_FEE;
        uint amountToAurora = convertToAssets(_amount);
        require(auroraBalance - amountToAurora > 0, "Not enough Aurora");
        uint feeAmount = swapFeeBasisPoints;
        amountToAurora = convertToAssets(_amount - feeAmount);
        require(
            amountToAurora >= _minReceived,
            "Slippage error: Swap doesn't reach min amount"
        );

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), _amount);
        auroraBalance -= amountToAurora;
        emit Swap(msg.sender, _amount, amountToAurora, feeAmount);
        return amountToAurora;
    }

    // PRIVATE ZONE

    function _checkAccount(address _expected) private view {
        require(msg.sender == _expected, "Access error");
    }

    function _checkDeposit(uint _amount) private view {
        require(
            _amount >= minDepositAmount,
            "Deposit does not cover minimum amount"
        );
    }

    function _calculatePoolFees(uint256 _amount)
        private
        view
        returns (uint256 _discountedAmount, uint256 _fee) {
        uint256 fee = (_amount * swapFeeBasisPoints) / 10_000;
        return (_amount - fee, fee);
    }

    function _deposit(
        address _caller,
        address _receiver,
        uint _assets,
        uint _shares
    ) internal virtual override {
        auroraBalance += _assets;

        IERC20(asset()).safeTransferFrom(
            msg.sender,
            address(this),
            _assets
        );
        _mint(_receiver, _shares);

        // TODO: Change events for standard events.
        emit AddLiquidity(_caller, _receiver, _assets, _shares);
    }
}