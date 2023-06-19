// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import { MockERC20 } from "../mocks/MockERC20.sol";
import { AuroraStaking } from "contracts/testing/AuroraStaking.sol";
import { StakedAuroraVault } from "contracts/StakedAuroraVault.sol";
import { LiquidityPool } from "contracts/LiquidityPool.sol";
import { StakingManager } from "contracts/StakingManager.sol";
import { Depositor } from "contracts/Depositor.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/// Values that will be hard-coded in the manager contract:
///     uint256 public constant MAX_MAX_WITHDRAW_ORDERS = 200;
///     uint256 public constant MIN_MAX_WITHDRAW_ORDERS = 50;
///     uint256 public constant MAX_DEPOSITORS = 20;

contract MaxCapacityHelper is Test {
    address public ALICE = makeAddr("ALICE");
    address public BOB = makeAddr("BOB");
    address public CHARLIE = makeAddr("CHARLIE");
    address public ATTACKER = makeAddr("ATTACKER");
    address public OPERATOR = makeAddr("OPERATOR");
    address public FEECOLLECTOR = makeAddr("FEECOLLECTOR");
    address public REWARDCOLLECTOR = makeAddr("REWARDCOLLECTOR");
    MockERC20 aur;
    MockERC20 centauri;
    AuroraStaking auroraStaking;
    StakedAuroraVault stakedAuroraVault;
    LiquidityPool liquidityPool;
    StakingManager stakingManager;
    // Depositor depositor;

    uint256 public constant MAX_MAX_WITHDRAW_ORDERS = 200;
    uint256 public constant MIN_MAX_WITHDRAW_ORDERS = 50;
    uint256 public constant MAX_DEPOSITORS = 20;

    constructor() {
        aur = new MockERC20("Aurora", "AUR");
        centauri = new MockERC20("Centauri", "CEN");
        stakedAuroraVault = new StakedAuroraVault(
            address(aur),
            OPERATOR,
            "Staked Aurora",
            "stAUR",
            0.01 ether
        );
        liquidityPool = new LiquidityPool(
            address(stakedAuroraVault),
            address(aur),
            FEECOLLECTOR,
            OPERATOR,
            "LP Aurora Vault",
            "lpAUR",
            0.01 ether,
            200,
            8000
        );
        auroraStaking = new AuroraStaking(
            address(aur),
            address(centauri)
        );
        stakingManager = new StakingManager(
            address(stakedAuroraVault),
            address(auroraStaking),
            OPERATOR,
            MAX_MAX_WITHDRAW_ORDERS
        );

        for (uint i = 0; i < MAX_DEPOSITORS; ++i) {
            Depositor _depositor = new Depositor(
                address(stakingManager),
                address(REWARDCOLLECTOR)
            );
            stakingManager.insertDepositor(address(_depositor));
        }
        stakedAuroraVault.initializeLiquidStaking(
            address(stakingManager),
            address(liquidityPool)
        );
        _depositPool();
    }

    /// depositPoolFixture
    function _depositPool() private {
        uint256 DEPOSIT_ALICE = 6_000 ether;
        uint256 DEPOSIT_BOB = 100_000 ether;
        uint256 DEPOSIT_CHARLIE = 24_000 ether;

        vm.startPrank(ALICE);
        {
            aur.approve(address(stakedAuroraVault), DEPOSIT_ALICE);
            stakedAuroraVault.deposit(DEPOSIT_ALICE, address(ALICE));
        }
        vm.stopPrank();

        // Use for 1 line, the next-line.
        vm.prank(OPERATOR);
        stakedAuroraVault.updateEnforceWhitelist(false);

        vm.startPrank(BOB);
        {
            aur.approve(address(stakedAuroraVault), DEPOSIT_BOB);
            stakedAuroraVault.deposit(DEPOSIT_BOB, address(BOB));
        }
        vm.stopPrank();

        vm.startPrank(CHARLIE);
        {
            aur.approve(address(stakedAuroraVault), DEPOSIT_CHARLIE);
            stakedAuroraVault.deposit(DEPOSIT_CHARLIE, address(CHARLIE));
        }
        vm.stopPrank();
        
        stakingManager.cleanOrdersQueue();
    }
}