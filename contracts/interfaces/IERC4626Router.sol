// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.18;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title ERC4626Router Interface
/// @notice Extends the ERC4626RouterBase with specific flows to save gas
interface IERC4626Router {
    /// @notice deposit `amount` to an ERC4626 vault.
    /// @param _vault The ERC4626 vault to deposit assets to.
    /// @param _to The destination of ownership shares.
    /// @param _amount The amount of assets to deposit to `vault`.
    /// @param _minSharesOut The min amount of `vault` shares received by `to`.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MinSharesError   
    function depositToVault(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut);

    /// @notice deposit max assets to an ERC4626 vault.
    /// @param _vault The ERC4626 vault to deposit assets to.
    /// @param _to The destination of ownership shares.
    /// @param _minSharesOut The min amount of `vault` shares received by `to`.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MinSharesError   
    function depositMax(
        IERC4626 _vault,
        address _to,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut);

    /// @notice redeem max shares to an ERC4626 vault.
    /// @param _vault The ERC4626 vault to redeem shares from.
    /// @param _to The destination of assets.
    /// @param _minAmountOut The min amount of assets received by `to`.
    /// @return _amountOut the amount of assets received by `to`.
    /// @dev throws MinAmountError   
    function redeemMax(
        IERC4626 _vault,
        address _to,
        uint256 _minAmountOut
    ) external returns (uint256 _amountOut);
}
