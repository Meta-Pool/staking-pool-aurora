// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool ERC4626 Fee Mintable contract utils.

import "./interfaces/IERC4626FeeMintable.sol";

abstract contract ERC4626FeeMintable is IERC4626FeeMintable {

    /// @notice All timestamps ⌛ are in seconds.
    uint16 constant public MAX_FEE_PER_YEAR_BASIS_POINT = 1500;
    uint32 constant public SECONDS_PER_YEAR = 60 * 60 * 24 * 365;

    /// The percent of the Yearly Fee.
    uint16 public feePerYearBasisPoints;

    /// Timestamp of the last time new Fee was minted.
    uint64 public lastFeeMint;

    /// Total seconds to allow minting new Fee again.
    uint64 immutable public coolingTime;

    modifier feeMintAvailable() {
        uint64 _availableAt = lastFeeMint + coolingTime;
        if (block.timestamp < _availableAt) {
            revert FeeMintNotAvailable(_availableAt);
        }
        _;
    }

    constructor(uint64 _coolingTime, uint16 _feePerYearBasisPoints) {
        if (_feePerYearBasisPoints > MAX_FEE_PER_YEAR_BASIS_POINT) {
            revert InvalidFeeAmount(_feePerYearBasisPoints);
        }
        coolingTime = _coolingTime;
        feePerYearBasisPoints = _feePerYearBasisPoints;
    }

    /// *********************
    /// * Virtual functions *
    /// *********************

    function mintFee() public virtual returns (uint256);
}