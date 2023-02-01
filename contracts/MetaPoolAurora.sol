// // SPDX-License-Identifier: MIT
// // OpenZeppelin Contracts (last updated v4.8.0) (token/ERC20/extensions/ERC4626.sol)

// pragma solidity ^0.8.9;

// // import "../ERC20.sol";
// // import "../utils/SafeERC20.sol";
// // import "../../../interfaces/IERC4626.sol";
// // import "../../../utils/math/Math.sol";
// import "@openzeppelin/contracts/utils/math/Math.sol";
// import "@openzeppelin/contracts/interfaces/IERC4626.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// // import "@openzeppelin/contracts/utils/Context.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";

// import "./StAuroraToken.sol";

// /**
//  * @dev Implementation of the ERC4626 "Tokenized Vault Standard" as defined in
//  * https://eips.ethereum.org/EIPS/eip-4626[EIP-4626].
//  *
//  * This extension allows the minting and burning of "shares" (represented using the ERC20 inheritance) in exchange for
//  * underlying "assets" through standardized {deposit}, {mint}, {redeem} and {burn} workflows. This contract extends
//  * the ERC20 standard. Any additional extensions included along it would affect the "shares" token represented by this
//  * contract and not the "assets" token which is an independent contract.
//  *
//  * CAUTION: When the vault is empty or nearly empty, deposits are at high risk of being stolen through frontrunning with
//  * a "donation" to the vault that inflates the price of a share. This is variously known as a donation or inflation
//  * attack and is essentially a problem of slippage. Vault deployers can protect against this attack by making an initial
//  * deposit of a non-trivial amount of the asset, such that price manipulation becomes infeasible. Withdrawals may
//  * similarly be affected by slippage. Users can protect against this attack as well unexpected slippage in general by
//  * verifying the amount received is as expected, using a wrapper that performs these checks such as
//  * https://github.com/fei-protocol/ERC4626#erc4626router-and-base[ERC4626Router].
//  *
//  * _Available since v4.7._
//  */

// // abstract contract ERC4626MetaPool is IERC4626 {
// contract MetaPoolAurora is AccessControl {
//     using Math for uint256;
//     using SafeERC20 for IERC20;

//     event Deposit(address indexed _caller, address indexed _receiver, uint256 _assets, uint256 _shares);

//     event Withdraw(address indexed _caller, address indexed _receiver, address indexed _owner, uint256 _assets, uint256 _shares);

//     IStAuroraToken private immutable _stAuroraToken;
//     address public immutable owner;
//     address public immutable treasury;
//     address public immutable operator;
//     address public immutable auroraPlus;

//     bytes32 public constant OWNER = keccak256("OWNER");
//     bytes32 public constant TREASURY = keccak256("TREASURY");
//     bytes32 public constant OPERATOR = keccak256("OPERATOR");

//     constructor(
//         address _owner,
//         address _treasury,
//         address _operator,
//         address _auroraPlus,
//         address _stToken
//     ) {
//         owner = _owner;
//         treasury = _treasury;
//         operator = _operator;
//         _grantRole(OWNER, _owner);
//         _grantRole(TREASURY, _treasury);
//         _grantRole(OPERATOR, _operator);

//         auroraPlus = _auroraPlus;
//         _stAuroraToken = IStAuroraToken(_stToken);
//         // This contract claim ownership of the stToken.
//         // _stAuroraToken.transferOwnership(address(this));
//     }

//     function decimals() public view returns (uint8) {
//         return _stAuroraToken.decimals();
//     }

//     function auroraToken() public view returns (address) {
//         return _stAuroraToken.asset();
//     }

//     function stAuroraToken() public view returns (address) {
//         return address(_stAuroraToken);
//     }

//     /** @dev See {IERC4626-asset}. */
//     function asset() public view returns (address) {
//         return _stAuroraToken.asset();
//     }

//     function assetInterface() public view returns (IERC20) {
//         return IERC20(_stAuroraToken.asset());
//     }

//     /** @dev See {IERC4626-totalAssets}. */
//     function totalAssets() public view returns (uint256) {
//         return assetInterface().balanceOf(address(this));
//     }

//     /** @dev See {IERC4626-convertToShares}. */
//     function convertToShares(uint256 _assets) public view returns (uint256) {
//         return _convertToShares(_assets, Math.Rounding.Down);
//     }

//     /** @dev See {IERC4626-convertToAssets}. */
//     function convertToAssets(uint256 _shares) public view returns (uint256) {
//         return _convertToAssets(_shares, Math.Rounding.Down);
//     }

//     /** @dev See {IERC4626-maxDeposit}. */
//     function maxDeposit(address) public view returns (uint256) {
//         return _isVaultHealthy() ? type(uint256).max : 0;
//     }

//     /** @dev See {IERC4626-maxMint}. */
//     function maxMint(address) public view returns (uint256) {
//         return type(uint256).max;
//     }

//     /** @dev See {IERC4626-maxWithdraw}. */
//     function maxWithdraw(address _owner) public view returns (uint256) {
//         return _convertToAssets(_stAuroraToken.balanceOf(_owner), Math.Rounding.Down);
//     }

//     /** @dev See {IERC4626-maxRedeem}. */
//     function maxRedeem(address _owner) public view returns (uint256) {
//         return _stAuroraToken.balanceOf(_owner);
//     }

//     /** @dev See {IERC4626-previewDeposit}. */
//     function previewDeposit(uint256 _assets) public view returns (uint256) {
//         return _convertToShares(_assets, Math.Rounding.Down);
//     }

//     /** @dev See {IERC4626-previewMint}. */
//     function previewMint(uint256 _shares) public view returns (uint256) {
//         return _convertToAssets(_shares, Math.Rounding.Up);
//     }

//     /** @dev See {IERC4626-previewWithdraw}. */
//     function previewWithdraw(uint256 _assets) public view returns (uint256) {
//         return _convertToShares(_assets, Math.Rounding.Up);
//     }

//     /** @dev See {IERC4626-previewRedeem}. */
//     function previewRedeem(uint256 _shares) public view returns (uint256) {
//         return _convertToAssets(_shares, Math.Rounding.Down);
//     }

//     /** @dev See {IERC4626-deposit}. */
//     function deposit(uint256 _assets, address _receiver) public returns (uint256) {
//         require(_assets <= maxDeposit(_receiver), "ERC4626: deposit more than max");

//         uint256 shares = previewDeposit(_assets);
//         _deposit(_msgSender(), _receiver, _assets, shares);

//         return shares;
//     }

//     /** @dev See {IERC4626-mint}.
//      *
//      * As opposed to {deposit}, minting is allowed even if the vault is in a state where the price of a share is zero.
//      * In this case, the shares will be minted without requiring any assets to be deposited.
//      */
//     function mint(uint256 _shares, address _receiver) public returns (uint256) {
//         require(_shares <= maxMint(_receiver), "ERC4626: mint more than max");

//         uint256 assets = previewMint(_shares);
//         _deposit(_msgSender(), _receiver, assets, _shares);

//         return assets;
//     }

//     /** @dev See {IERC4626-withdraw}. */
//     function withdraw(uint256 _assets, address _receiver, address _owner) public returns (uint256) {
//         require(_assets <= maxWithdraw(_owner), "ERC4626: withdraw more than max");

//         uint256 shares = previewWithdraw(_assets);
//         _withdraw(_msgSender(), _receiver, _owner, _assets, shares);

//         return shares;
//     }

//     /** @dev See {IERC4626-redeem}. */
//     function redeem(uint256 _shares, address _receiver, address _owner) public returns (uint256) {
//         require(_shares <= maxRedeem(_owner), "ERC4626: redeem more than max");

//         uint256 assets = previewRedeem(_shares);
//         _withdraw(_msgSender(), _receiver, _owner, assets, _shares);

//         return assets;
//     }

//     /**
//      * @dev Internal conversion function (from assets to shares) with support for rounding direction.
//      *
//      * Will revert if assets > 0, totalSupply > 0 and totalAssets = 0. That corresponds to a case where any asset
//      * would represent an infinite amount of shares.
//      */
//     function _convertToShares(uint256 _assets, Math.Rounding rounding) internal view returns (uint256) {
//         uint256 supply = _stAuroraToken.totalSupply();
//         return
//             (_assets == 0 || supply == 0)
//                 ? _initialConvertToShares(_assets, rounding)
//                 : _assets.mulDiv(supply, totalAssets(), rounding);
//     }

//     /**
//      * @dev Internal conversion function (from assets to shares) to apply when the vault is empty.
//      *
//      * NOTE: Make sure to keep this function consistent with {_initialConvertToAssets} when overriding it.
//      */
//     function _initialConvertToShares(
//         uint256 _assets,
//         Math.Rounding /*rounding*/
//     ) internal view returns (uint256 shares) {
//         return _assets;
//     }

//     /**
//      * @dev Internal conversion function (from shares to assets) with support for rounding direction.
//      */
//     function _convertToAssets(uint256 _shares, Math.Rounding rounding) internal view returns (uint256) {
//         uint256 supply = _stAuroraToken.totalSupply();
//         return
//             (supply == 0) ? _initialConvertToAssets(_shares, rounding) : _shares.mulDiv(totalAssets(), supply, rounding);
//     }

//     /**
//      * @dev Internal conversion function (from shares to assets) to apply when the vault is empty.
//      *
//      * NOTE: Make sure to keep this function consistent with {_initialConvertToShares} when overriding it.
//      */
//     function _initialConvertToAssets(
//         uint256 _shares,
//         Math.Rounding /*rounding*/
//     ) internal view returns (uint256) {
//         return _shares;
//     }

//     /**
//      * @dev Deposit/mint common workflow.
//      */
//     function _deposit(address _caller, address _receiver, uint256 _assets, uint256 _shares) internal {
//         // If _asset is ERC777, `transferFrom` can trigger a reenterancy BEFORE the transfer happens through the
//         // `tokensToSend` hook. On the other hand, the `tokenReceived` hook, that is triggered after the transfer,
//         // calls the vault, which is assumed not malicious.
//         //
//         // Conclusion: we need to do the transfer before we mint so that any reentrancy would happen before the
//         // assets are transferred and before the shares are minted, which is a valid state.
//         // slither-disable-next-line reentrancy-no-eth
//         SafeERC20.safeTransferFrom(assetInterface(), _caller, address(this), _assets);
//         _stAuroraToken.mint(_receiver, _shares);

//         emit Deposit(_caller, _receiver, _assets, _shares);
//     }

//     /**
//      * @dev Withdraw/redeem common workflow.
//      */
//     function _withdraw(
//         address _caller,
//         address _receiver,
//         address _owner,
//         uint256 _assets,
//         uint256 _shares
//     ) internal {
//         if (_caller != _owner) {
//             _stAuroraToken.spendAllowance(_owner, _caller, _shares);
//         }

//         // If _asset is ERC777, `transfer` can trigger a reentrancy AFTER the transfer happens through the
//         // `tokensReceived` hook. On the other hand, the `tokensToSend` hook, that is triggered before the transfer,
//         // calls the vault, which is assumed not malicious.
//         //
//         // Conclusion: we need to do the transfer after the burn so that any reentrancy would happen after the
//         // shares are burned and after the assets are transferred, which is a valid state.
//         _stAuroraToken.burn(_owner, _shares);
//         SafeERC20.safeTransfer(assetInterface(), _receiver, _assets);

//         emit Withdraw(_caller, _receiver, _owner, _assets, _shares);
//     }

//     /**
//      * @dev Checks if vault is "healthy" in the sense of having assets backing the circulating shares.
//      */
//     function _isVaultHealthy() private view returns (bool) {
//         return totalAssets() > 0 || _stAuroraToken.totalSupply() == 0;
//     }
// }
