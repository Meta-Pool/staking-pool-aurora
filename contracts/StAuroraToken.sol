// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StAuroraToken is ERC20 {

    using SafeERC20 for IERC20;

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {}

    function mintAfterStake(address to, uint256 amount) internal {
        _mint(to, amount);
    }
}
