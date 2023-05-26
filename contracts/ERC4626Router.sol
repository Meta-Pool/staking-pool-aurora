// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @notice The Router was developed using the following repository as reference:
/// https://github.com/fei-protocol/ERC4626

import {IERC4626RouterBase} from "./interfaces/IERC4626RouterBase.sol";
import {IERC4626Router} from "./interfaces/IERC4626Router.sol";

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ERC4626Router is IERC4626Router, IERC4626RouterBase {
    using SafeERC20 for IERC20;

    constructor() {}

    /// @inheritdoc IERC4626Router
    function depositToVault(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut) {
        _pullToken(IERC20(_vault.asset()), _amount, address(this));
        return deposit(_vault, _to, _amount, _minSharesOut);
    }

    /// @inheritdoc IERC4626Router
    function depositMax(
        IERC4626 _vault,
        address _to,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut) {
        IERC20 asset = IERC20(_vault.asset());
        uint256 assetBalance = asset.balanceOf(msg.sender);
        uint256 maxDeposit = _vault.maxDeposit(_to);
        uint256 amount = maxDeposit < assetBalance ? maxDeposit : assetBalance;
        _pullToken(asset, amount, address(this));
        return deposit(_vault, _to, amount, _minSharesOut);
    }

    /// @inheritdoc IERC4626Router
    function redeemMax(
        IERC4626 _vault,
        address _to,
        uint256 _minAmountOut
    ) external returns (uint256 _amountOut) {
        uint256 shareBalance = _vault.balanceOf(msg.sender);
        uint256 maxRedeem = _vault.maxRedeem(msg.sender);
        uint256 amountShares = maxRedeem < shareBalance ? maxRedeem : shareBalance;
        return redeem(_vault, _to, amountShares, _minAmountOut);
    }

    /// ********************************
    /// * ERC4626Router Base functions *
    /// ********************************

    /// @inheritdoc IERC4626RouterBase
    function mint(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _maxAmountIn
    ) public returns (uint256 _amountIn) {
        if ((_amountIn = _vault.mint(_shares, _to)) > _maxAmountIn) {
            revert MaxAmountError();
        }
    }

    /// @inheritdoc IERC4626RouterBase
    function deposit(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) public returns (uint256 _sharesOut) {
        if ((_sharesOut = _vault.deposit(_amount, _to)) < _minSharesOut) {
            revert MinSharesError();
        }
    }

    /// @inheritdoc IERC4626RouterBase
    function withdraw(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _maxSharesOut
    ) public returns (uint256 _sharesOut) {
        if ((_sharesOut = _vault.withdraw(_amount, _to, msg.sender)) > _maxSharesOut) {
            revert MaxSharesError();
        }
    }

    /// @inheritdoc IERC4626RouterBase
    function redeem(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _minAmountOut
    ) public returns (uint256 _amountOut) {
        if ((_amountOut = _vault.redeem(_shares, _to, msg.sender)) < _minAmountOut) {
            revert MinAmountError();
        }
    }

    /// ************************
    /// * Private 🦡 functions *
    /// ************************

    /// @dev Safe Transfer funds from sender to recipient.
    function _pullToken(IERC20 _token, uint256 _amount, address _recipient) private {
        _token.safeTransferFrom(msg.sender, _recipient, _amount);
    }
}
