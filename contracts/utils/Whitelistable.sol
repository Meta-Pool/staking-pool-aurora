// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title Meta Pool Whitelistable contract utils.

import "./interfaces/IWhitelistable.sol";

abstract contract Whitelistable is IWhitelistable {

    bool public enforceWhitelist;
    mapping(address => bool) public accountWhitelist;

    modifier checkWhitelist() {
        if (enforceWhitelist && !isWhitelisted(msg.sender)) {
            revert AccountNotWhitelisted();
        }
        _;
    }

    constructor() {}

    function isWhitelisted(address _account) public view returns (bool) {
        return accountWhitelist[_account];
    }

    /// *********************
    /// * Virtual functions *
    /// *********************

    function blacklistAccount(address _account) public virtual;
    function bulkBlacklistAccount(address[] memory _accounts) external virtual;
    function bulkWhitelistAccount(address[] memory _accounts) external virtual;
    function updateEnforceWhitelist(bool _isWhitelistRequired) external virtual;
    function whitelistAccount(address _account) public virtual;
}