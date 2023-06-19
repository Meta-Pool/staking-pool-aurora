// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IWhitelistable {
    error AccountNotWhitelisted();

    function isWhitelisted(address _account) external view returns (bool);
}