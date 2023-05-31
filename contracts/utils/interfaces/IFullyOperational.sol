// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IFullyOperational {
    error NotFullyOperational();

    function isFullyOperational() external view returns (bool);
}