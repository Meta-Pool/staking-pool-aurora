// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IStAuroraToken is IERC20 {
    function decimals() external view returns (uint8);

    function asset() external view returns (address);

    function mint(address to, uint256 amount) external;

    function spendAllowance(address owner, address caller, uint256 shares) external;

    function burn(address owner, uint256 shares) external;

    function transferOwnership(address newOwner) external;
}

contract StAuroraToken is ERC20, Ownable {
    // using SafeERC20 for IERC20;

    IERC20 private immutable _asset;
    uint8 private immutable _decimals;

    /**
     * @dev Set the underlying asset contract. This must be an ERC20-compatible contract (ERC20 or ERC777).
     */
    constructor(
        string memory name,
        string memory symbol,
        address asset_
    ) ERC20(name, symbol) {
        _asset = IERC20(asset_);
        (bool success, uint8 assetDecimals) = _tryGetAssetDecimals(_asset);
        _decimals = success ? assetDecimals : super.decimals();
    }

    /**
     * @dev Attempts to fetch the asset decimals. A return value of false indicates that the attempt failed in some way.
     */
    function _tryGetAssetDecimals(IERC20 asset_) private view returns (bool, uint8) {
        (bool success, bytes memory encodedDecimals) = address(asset_).staticcall(
            abi.encodeWithSelector(IERC20Metadata.decimals.selector)
        );
        if (success && encodedDecimals.length >= 32) {
            uint256 returnedDecimals = abi.decode(encodedDecimals, (uint256));
            if (returnedDecimals <= type(uint8).max) {
                return (true, uint8(returnedDecimals));
            }
        }
        return (false, 0);
    }

    /**
     * @dev Decimals are read from the underlying asset in the constructor and cached. If this fails (e.g., the asset
     * has not been created yet), the cached value is set to a default obtained by `super.decimals()` (which depends on
     * inheritance but is most likely 18). Override this function in order to set a guaranteed hardcoded value.
     * See {IERC20Metadata-decimals}.
     */
    function decimals() public view override(ERC20) returns (uint8) {
        return _decimals;
    }

    /** @dev See {IERC4626-asset}. */
    function asset() public view returns (address) {
        return address(_asset);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function spendAllowance(address owner, address caller, uint256 shares) public onlyOwner {
        _spendAllowance(owner, caller, shares);
    }

    function burn(address owner, uint256 shares) public onlyOwner {
        _burn(owner, shares);
    }
}
