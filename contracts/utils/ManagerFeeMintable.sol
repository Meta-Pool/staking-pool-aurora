// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool ERC4626 Fee Mintable contract utils.

/// @notice Allow the `StakingManager` contract to charge a fee for the service.

import "./interfaces/IManagerFeeMintable.sol";

abstract contract ManagerFeeMintable is IManagerFeeMintable {

    address public treasuryAccount;

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
        uint16 _feePerYearBasisPoints,
        address _treasuryAccount
    ) checkBasisPoints(_feePerYearBasisPoints) {
        feePerYearBasisPoints = _feePerYearBasisPoints;
        lastFeeMint = uint64(block.timestamp);
        treasuryAccount = _treasuryAccount;
    }

    function _proportional(
        uint256 _amount,
        uint256 _numerator,
        uint256 _denominator
    ) private pure returns (uint256) {
        return (_amount * _numerator) / _denominator;
    }

    /// @notice Top Fee is defined by `feePerYearBasisPoints`.
    function _calculateAvailableMintFee(
        uint256 _totalSupply
    ) internal view returns (uint256 _fee) {
        // Consider elapsed time ⏰
        uint256 _elapsedSeconds = block.timestamp - uint256(lastFeeMint);
        _fee = _proportional(_totalSupply, _elapsedSeconds, uint256(SECONDS_PER_YEAR));

        // Now, consider the max fee per year.
        _fee = _proportional(_fee, uint256(feePerYearBasisPoints), 10_000);
    }

    /// *********************
    /// * Virtual functions *
    /// *********************

    ///@notice Must emit `TreasuryMintedFee` event.
    function mintFee() public virtual returns (uint256);

    function updateFeePerYear(uint16 _basisPoints) public virtual;
    function getAvailableMintFee() public virtual view returns (uint256);
}

/// @notice Example of Virtual functions.

// // **********************
// // * Treasury functions *
// // **********************

// function mintFee() public override
//     onlyRole(TREASURY_ROLE)
//     feeMintAvailable
// returns (uint256) {
//     uint256 _fee = getAvailableMintFee();
//     stAurVault.mintFee(msg.sender, _fee);
//     lastFeeMint = uint64(block.timestamp);

//     emit TreasuryMintedFee(msg.sender, _fee);
//     return _fee;
// }

// function updateFeePerYear(
//     uint16 _basisPoints
// ) public override onlyRole(ADMIN_ROLE) checkBasisPoints(_basisPoints) {
//     feePerYearBasisPoints = _basisPoints;
// }

// function getAvailableMintFee() public override view returns (uint256) {
//     return _calculateAvailableMintFee(stAurVault.totalSupply());
// }