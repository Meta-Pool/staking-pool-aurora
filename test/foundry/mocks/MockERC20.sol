// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.18;
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
 
contract MockERC20 is ERC20 {
    using SafeERC20 for IERC20;
 
    // @notice Constructs the Mock Token contract.
    // @param name The name of the token.
    // @param symbol The symbol of the token.
    // @param supply The amount of supply for the token.
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        uint128 supply = 10_000_000 ether;
        _mint(msg.sender, supply);
    }
 
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
 