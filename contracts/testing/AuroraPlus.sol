// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AuroraPlus {

    address immutable auroraToken;
    uint256 immutable deployTimestamp;

    mapping(address => uint256) balances;

    constructor(address _auroraToken) {
        auroraToken = _auroraToken;
        deployTimestamp = block.timestamp;
    }

    /// @dev a user stakes amount of AURORA tokens
    /// The user should approve these tokens to the treasury
    /// contract in order to complete the stake.
    /// @param amount is the AURORA amount.
    function stake(uint256 amount) external {
        IERC20(auroraToken).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
    }

    /// @dev gets the total user deposit
    /// @param account the user address
    /// @return user total deposit in (AURORA)
    function getUserTotalDeposit(address account)
        external
        view
        returns (uint256)
    {
        uint256 factor = (block.timestamp - deployTimestamp) * (10 ** 8);
        return balances[account] + factor;
    }
}