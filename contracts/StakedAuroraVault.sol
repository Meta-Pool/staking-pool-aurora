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

contract StakedAuroraVault is ERC4626, Ownable {
    using SafeERC20 for IERC20;

    address[] public legacyStakingManagers;
    address[] public legacyLiquidityPools;

    address public stakingManager;
    address public liquidityPool;
    uint256 public minDepositAmount;

    bool public fullyOperational;

    modifier onlyManager() {
        require(
            stakingManager != address(0)
                && msg.sender == stakingManager,
            "ONLY_STAKING_MANAGER"
        );
        _;
    }

    modifier onlyFullyOperational() {
        require(fullyOperational, "CONTRACT_IS_NOT_FULLY_OPERATIONAL");
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

    function toggleFullyOperational() external onlyOwner {
        require(liquidityPool != address(0) && stakingManager != address(0), "CONTRACT_NOT_INITIALIZED");
        fullyOperational = !fullyOperational;
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
    ) public override onlyFullyOperational returns (uint256) {
        require(_assets <= maxDeposit(_receiver), "ERC4626: deposit more than max");
        require(_assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");

        uint256 shares = previewDeposit(_assets);
        _deposit(_msgSender(), _receiver, _assets, shares);

        return shares;
    }

    /// As opposed to {deposit}, minting is allowed even if the vault is in a state where the price of a share is zero.
    /// In this case, the shares will be minted without requiring any assets to be deposited.
    function mint(
        uint256 _shares,
        address _receiver
    ) public override onlyFullyOperational returns (uint256) {
        require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");

        uint256 assets = previewMint(_shares);
        require(assets >= minDepositAmount, "LESS_THAN_MIN_DEPOSIT_AMOUNT");
        _deposit(_msgSender(), _receiver, assets, _shares);

        return assets;
    }

    function withdraw(
        uint256 _assets,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        // TODO: ⛔ This flow is untested for withdraw and redeem. Test allowance.
        // By commenting out, we are running the test for 3rd party withdraw.
        // if (_owner != _msgSender()) require(false, "UNTESTED_ALLOWANCE_FOR_WITHDRAW");

        // console.log("Assets: %s", _assets);
        // console.log("max wi: %s", maxWithdraw(_owner));

        // TODO: ⛔ No require is being performed here! Please confirm it's safe!
        // require(_assets <= maxWithdraw(_owner), "ERC4626: withdraw more than max");

        // console.log("1. assets %s <> %s", _assets, 0);
        uint256 shares = previewWithdraw(_assets);
        // console.log("2. shares %s <> %s", shares, 0);
        // console.log("alice: %s", _owner);
        _withdraw(_msgSender(), _receiver, _owner, _assets, shares);
        // console.log("3. assets and shares %s <> %s", shares, 0);

        return shares;
    }

    function redeem(
        uint256 _shares,
        address _receiver,
        address _owner
    ) public override returns (uint256) {
        // TODO: ⛔ This flow is untested for withdraw and redeem.
        // By commenting out, we are running the test for 3rd party redeem.
        // if (_owner != _msgSender()) require(false, "UNTESTED_ALLOWANCE_FOR_REDEEM");

        // TODO: ⛔ This might be a solution for the allowance. But please test it.
        if (_msgSender() != _owner) {
            _spendAllowance(_owner, _msgSender(), _shares);
        }

        // require(_shares <= maxRedeem(_owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(_shares);
        IStakingManager(stakingManager).unstakeShares(assets, _shares, _receiver, _owner);

        return assets;
    }

    function burn(address _owner, uint256 _shares) external onlyManager {
        _burn(_owner, _shares);
    }

    /// @dev Deposit/mint common workflow.
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
        bool stAurTransfered = pool.transferStAur(_receiver, _shares);

        // FLOW 1: Use the stAUR in the Liquidity Pool.
        if (stAurTransfered) {
            auroraToken.safeIncreaseAllowance(liquidityPool, _assets);
            pool.getAuroraFromVault(_assets);
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

    /// @dev Withdraw/redeem common workflow.
    function _withdraw(
        address _caller,
        address _receiver,
        address _owner,
        uint256 _assets,
        uint256 _shares
    ) internal override {
        // console.log("caller: %s", _caller);
        // console.log("owner: %s", _owner);
        if (_caller != _owner) {
            _spendAllowance(_owner, _caller, _shares);
        }

        // console.log("2.5. ASSets:%s <> %s", _assets, 0);
        // IMPORTANT!!! IF this withdraw will only works with delayed unstake, then
        // the burn is already made by the staking manager.
        // _burn(owner, shares);

        IStakingManager(stakingManager).transferAurora(_receiver, _owner, _assets);
        // console.log("2.6. assets and shares %s <> %s", _shares, 0);

        emit Withdraw(_caller, _receiver, _owner, _assets, _shares);
    }
}