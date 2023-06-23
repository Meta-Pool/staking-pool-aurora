// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool ERC4626 Fee Mintable contract utils.

import "./interfaces/IManagerFeeMintable.sol";

abstract contract ManagerFeeMintable is IManagerFeeMintable {

    /// @notice All timestamps ⌛ are in seconds.
    uint16 constant public MAX_FEE_PER_YEAR_BASIS_POINT = 1500;
    uint32 constant public SECONDS_PER_YEAR = 60 * 60 * 24 * 365;

    /// Total seconds to allow minting new Fee again.
    uint64 constant public coolingTimeSeconds = 60 * 60 * 24;

    /// The percent of the Yearly Fee.
    uint16 public feePerYearBasisPoints;

    /// Timestamp of the last time new Fee was minted.
    uint64 public lastFeeMint;

    modifier feeMintAvailable() {
        uint64 _availableAt = lastFeeMint + coolingTimeSeconds;
        if (block.timestamp < _availableAt) {
            revert FeeMintNotAvailable(_availableAt);
        }
        _;
    }

    modifier checkBasisPoints(uint16 _basisPoints) {
        if (_basisPoints > MAX_FEE_PER_YEAR_BASIS_POINT) {
            revert InvalidFeeAmount(_basisPoints);
        }
        _;
    }

    constructor(
        uint16 _feePerYearBasisPoints
    ) checkBasisPoints(_feePerYearBasisPoints) {
        feePerYearBasisPoints = _feePerYearBasisPoints;
        lastFeeMint = uint64(block.timestamp);
    }

    /// *********************
    /// * Virtual functions *
    /// *********************

    function mintFee() public virtual returns (uint256);
    function updateFeePerYear(uint16 _basisPoints) public virtual;
}