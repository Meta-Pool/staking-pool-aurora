// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StAuroraToken is ERC20 {

    address public owner;

    constructor() ERC20("stakedAURORA", "stAURORA") {
        // uint256 initialSupply = 0;
        // _mint(msg.sender, initialSupply);
        owner = msg.sender;
    }

    function mintAfterStake(address to, uint256 amount) public virtual {
        // require(hasRole(MINTER_ROLE, _msgSender()), "ERC20PresetMinterPauser: must have minter role to mint");
        _mint(to, amount);
    }
}