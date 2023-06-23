// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IManagerFeeMintable {
    error FeeMintNotAvailable(uint64 _availableAt);
    error InvalidFeeAmount(uint16 _feeBasisPoint);

    // function isWhitelisted(address _account) external view returns (bool);
}