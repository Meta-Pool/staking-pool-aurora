// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// import "./StakingManager.sol";
import "./interfaces/IStakingManager.sol";
import "./interfaces/IStakedAuroraVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LiquidityPool is ERC4626 {
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    address public stAuroraToken;

    address public stakingManager;
    uint256 public minimumLiquidity;
    uint256 public minDepositAmount;
    uint public auroraBalance;
    // Check if a treasury is needed
    address public treasury;
    uint16 public constant MIN_FEE = 30;
    uint16 public constant MAX_FEE = 500;
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
        uint stAurora
    );
    event Swap(address indexed user, uint amountIn, uint amountOut, uint fees);

    modifier onlyManager() {
        require(
            stakingManager != address(0) && msg.sender == stakingManager,
            "ONLY_STAKING_MANAGER"
        );
        _;
    }

    // staking manager call constructor
    constructor(
        address _stakingManager,
        address _auroraToken,
        uint256 _minDepositAmount,
        uint256 _minLiquidity
    ) ERC4626(IERC20(_auroraToken)) ERC20("stAUR/AUR LP", "stAUR/AUR") {
        require(_stakingManager != address(0));
        require(_auroraToken != address(0));
        stakingManager = _stakingManager;
        stAuroraToken = IStakingManager(_stakingManager).stAurora();
        minDepositAmount = _minDepositAmount;
        minimumLiquidity = _minLiquidity;
    }

    receive() external payable {}

    modifier validDeposit(uint _amount) {
        _checkDeposit(_amount);
        _;
    }

    function _checkAccount(address _expected) private view {
        require(msg.sender == _expected, "Access error");
    }

    function _checkDeposit(uint _amount) internal view {
        require(
            _amount >= minDepositAmount,
            "Deposit does not cover minimum amount"
        );
    }

    function updateStakingManager(
        address _stakingManager
    ) external onlyManager {
        require(_stakingManager != address(0));
        stakingManager = _stakingManager;
    }

    function updateMinimumLiquidity(uint256 _amount) external onlyManager {
        minimumLiquidity = _amount;
    }

    /// @notice Return the amount of stAur and Aurora equivalent to Aurora in the pool
    function totalAssets() public view override returns (uint) {
        address _stAuroraVault = IStakingManager(stakingManager).stAurora();
        return
            auroraBalance +
            IStakedAuroraVault(_stAuroraVault).convertToAssets(
                IStakedAuroraVault(_stAuroraVault).balanceOf(address(this))
            );
    }

    function deposit(
        uint _assets,
        address _receiver
    ) public override validDeposit(_assets) returns (uint) {
        uint _shares = previewDeposit(_assets);
        _deposit(msg.sender, _receiver, _assets, _shares);
        return _shares;
    }

    function _deposit(
        address _caller,
        address _receiver,
        uint _assets,
        uint _shares
    ) internal virtual override {
        if (_assets != 0) {
            IERC20(asset()).safeTransferFrom(
                msg.sender,
                address(this),
                _assets
            );
        } else {
            _assets = msg.value;
        }
        _mint(_receiver, _shares);
        auroraBalance += _assets;
        emit AddLiquidity(_caller, _receiver, _assets, _shares);
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
            IStakedAuroraVault(IStakingManager(stakingManager).stAurora()).balanceOf(address(this))) / ONE_AURORA;
        _burn(msg.sender, _shares);
        IERC20(asset()).safeTransfer(_receiver, auroraToSend);
        IERC20(stAuroraToken).safeTransfer(_receiver, stAuroraToSend);
        auroraBalance -= auroraToSend;
        emit RemoveLiquidity(msg.sender, _shares, auroraToSend, stAuroraToSend);
        return auroraToSend;
    }

    function swapStAuroraforAurora(
        uint _amount,
        uint _minReceived
    ) external returns (uint) {
        uint16 feeRange = MAX_FEE - MIN_FEE;
        uint amountToAurora = convertToAssets(_amount);
        require(auroraBalance - amountToAurora > 0, "Not enough Aurora");
        uint feeAmount = MIN_FEE;
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
}
