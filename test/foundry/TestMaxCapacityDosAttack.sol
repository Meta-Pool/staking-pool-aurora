// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./utils/MaxCapacityHelper.sol";

/// Testing 

/// Based on Halborn Audit `HAL-05` and `HAL-06`.

contract TestMaxCapacityDosAttack is MaxCapacityHelper {
    // uint256 testNumber;

    function setUp() public {}

    function testMaxCapacity() public {

    }

    // function testInflationAttack() public {
    //     prepareBalances();

    //     vm.prank(OPERATOR);
    //     stakedAuroraVault.updateEnforceWhitelist(false);

    //     console.log("[-] Initial balances:");
    //     printBalances();

    //     vm.startPrank(ATTACKER);
    //     {
    //         aur.approve(address(stakedAuroraVault), 100 ether + 1);
    //         stakedAuroraVault.deposit(100 ether + 1, ATTACKER);
            
    //         console.log("[*] After ATTACKER's deposit:");
    //         printBalances();

    //         // v0.1.1 removing the `burn` functionality.
    //         // stakedAuroraVault.burn(100 ether);  // Inflate shares' value
    //         console.log("[*] After ATTACKER's inflation:");
    //         printBalances();
    //     }
    //     vm.stopPrank();

    //     vm.startPrank(ALICE);
    //     {
    //         aur.approve(address(stakedAuroraVault), 200 ether);
    //         stakedAuroraVault.deposit(200 ether, ALICE);
    //     }
    //     vm.stopPrank();

    //     console.log("[+] Victim deposit tokens:");
    //     printBalances();

    //     vm.startPrank(ATTACKER);
    //     {
    //         stakedAuroraVault.redeem(1, ATTACKER, ATTACKER);
    //         stakingManager.cleanOrdersQueue();  // Set tokens as pending
            
    //         skip(2 hours);  // AURORA's tau

    //         stakingManager.cleanOrdersQueue();  // Withdraw pending tokens
    //         stakedAuroraVault.withdraw(
    //             stakingManager.getAvailableAssets(ATTACKER),
    //             ATTACKER,
    //             ATTACKER
    //         );
    //     }
    //     vm.stopPrank();

    //     console.log("[*] After ATTACKER's withdraw:");
    //     printBalances();

    //     // Correct Balances at the end 😼.
    //     // Attacker AUR balance:  100000000000000000000
    //     assertEq(aur.balanceOf(ATTACKER), 100000000000000000000);
    //     // Attacker stAUR balance:  100000000000000000000
    //     assertEq(stakedAuroraVault.balanceOf(ATTACKER), 100000000000000000000);
    //     // stAUR total supply:  300000000000000000000
    //     assertEq(stakedAuroraVault.totalSupply(), 300000000000000000000);
    //     // Alice AUR balance:  0
    //     assertEq(aur.balanceOf(ALICE),  0);
    //     // Alice stAUR balance:  200000000000000000000
    //     assertEq(stakedAuroraVault.balanceOf(ALICE), 200000000000000000000);
    // }

    // function prepareBalances() public {
    //     aur.mint(ALICE, 200 ether);
    //     aur.mint(BOB, 200 ether);
    //     aur.mint(CHARLIE, 200 ether);

    //     aur.mint(ATTACKER, 200 ether);
    // }

    // function printBalances() public view {
    //     console.log("\t- Attacker AUR balance: ", aur.balanceOf(ATTACKER));
    //     console.log("\t- Attacker stAUR balance: ", stakedAuroraVault.balanceOf(ATTACKER));
    //     console.log("\t- stAUR total supply: ", stakedAuroraVault.totalSupply());
    //     console.log("\t- Alice AUR balance: ", aur.balanceOf(ALICE));
    //     console.log("\t- Alice stAUR balance: ", stakedAuroraVault.balanceOf(ALICE));
    //     console.log("");
    // }

}