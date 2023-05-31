// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool FullyOperational contract utils.

import "./interfaces/IFullyOperational.sol";

abstract contract FullyOperational is IFullyOperational {

    bool public fullyOperational;

    modifier onlyFullyOperational() {
        if (!isFullyOperational()) { revert NotFullyOperational(); }
        _;
    }

    constructor() {}

    function isFullyOperational() public view returns (bool) {
        return fullyOperational;
    }

    /// *********************
    /// * Virtual functions *
    /// *********************

    function updateContractOperation(bool _isFullyOperational) public virtual;
}