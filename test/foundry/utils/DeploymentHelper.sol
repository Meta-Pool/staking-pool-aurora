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

contract DeploymentHelper is Test {
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
    Depositor depositor;
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
            50
        );
        depositor = new Depositor(
            address(stakingManager),
            address(REWARDCOLLECTOR)
        );
        stakingManager.insertDepositor(address(depositor));
        stakedAuroraVault.initializeLiquidStaking(
            address(stakingManager),
            address(liquidityPool)
        );
    }
}