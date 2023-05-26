// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.18;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title ERC4626Router Base Interface
/// @notice A canonical router between ERC4626 Vaults https://eips.ethereum.org/EIPS/eip-4626

/// The base router is a multicall style router inspired by Uniswap v3 with built-in features for permit, WETH9 wrap/unwrap, and ERC20 token pulling/sweeping/approving.
/// It includes methods for the four mutable ERC4626 functions deposit/mint/withdraw/redeem as well.

/// These can all be arbitrarily composed using the multicall functionality of the router.

/// NOTE the router is capable of pulling any approved token from your wallet. This is only possible when your address is msg.sender, but regardless be careful when interacting with the router or ERC4626 Vaults.
/// The router makes no special considerations for unique ERC20 implementations such as fee on transfer.
/// There are no built in protections for unexpected behavior beyond enforcing the minSharesOut is received.

interface IERC4626RouterBase {
    /************************** Errors **************************/

    /// @notice thrown when amount of assets received is below the min set by caller
    error MinAmountError();

    /// @notice thrown when amount of shares received is below the min set by caller
    error MinSharesError();

    /// @notice thrown when amount of assets received is above the max set by caller
    error MaxAmountError();

    /// @notice thrown when amount of shares received is above the max set by caller
    error MaxSharesError();

    /************************** Mint **************************/

    /// @notice mint `shares` from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to mint shares from.
    /// @param _to The destination of ownership shares.
    /// @param _shares The amount of shares to mint from `vault`.
    /// @param _maxAmountIn The max amount of assets used to mint.
    /// @return _amountIn the amount of assets used to mint by `to`.
    /// @dev throws MaxAmountError
    function mint(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _maxAmountIn
    ) external returns (uint256 _amountIn);

    /************************** Deposit **************************/

    /// @notice deposit `amount` to an ERC4626 vault.
    /// @param _vault The ERC4626 vault to deposit assets to.
    /// @param _to The destination of ownership shares.
    /// @param _amount The amount of assets to deposit to `vault`.
    /// @param _minSharesOut The min amount of `vault` shares received by `to`.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MinSharesError
    function deposit(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut);

    /************************** Withdraw **************************/

    /// @notice withdraw `amount` from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to withdraw assets from.
    /// @param _to The destination of assets.
    /// @param _amount The amount of assets to withdraw from vault.
    /// @param _minSharesOut The min amount of shares received by `to`.
    /// @return _sharesOut the amount of shares received by `to`.
    /// @dev throws MaxSharesError
    function withdraw(
        IERC4626 _vault,
        address _to,
        uint256 _amount,
        uint256 _minSharesOut
    ) external returns (uint256 _sharesOut);

    /************************** Redeem **************************/

    /// @notice redeem `shares` shares from an ERC4626 vault.
    /// @param _vault The ERC4626 vault to redeem shares from.
    /// @param _to The destination of assets.
    /// @param _shares The amount of shares to redeem from vault.
    /// @param _minAmountOut The min amount of assets received by `to`.
    /// @return _amountOut the amount of assets received by `to`.
    /// @dev throws MinAmountError
    function redeem(
        IERC4626 _vault,
        address _to,
        uint256 _shares,
        uint256 _minAmountOut
    ) external returns (uint256 _amountOut);
}
