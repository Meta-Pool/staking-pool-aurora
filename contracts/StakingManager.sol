// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IAuroraStaking {

    uint256 public totalAuroraShares;

    struct User {
        uint256 deposit;
        uint256 auroraShares;
        uint256 streamShares;
        mapping(uint256 => uint256) pendings; // The amount of tokens pending release for user per stream
        mapping(uint256 => uint256) releaseTime; // The release moment per stream
        mapping(uint256 => uint256) rpsDuringLastClaim; // RPS or reward per share during the previous rewards claim
    }
    
    mapping(address => User) public users;

    function getTotalAmountOfStakedAurora() external view returns (uint256);
}


contract StakingManager {

    address immutable public stAurora;
    address immutable public auroraToken;
    address immutable public auroraStaking;
    address[] public depositors;

    uint256 public lpTotalAsset;
    uint256 public lpTotalShare;

    constructor(address _stAurora, address _auroraStaking) {
        require(_stAurora != address(0) && _auroraStaking != address(0));
        stAurora = _stAurora;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(stAurora).asset();
    }

    function getTotalAssetsFromDepositors() public returns (uint256) {
        uint8 arrayLength = depositors.length;
        uint256 depositorsAuroraShares = 0;
        if (arrayLength == 0) return 0;
        for (uint i=0; i<arrayLength; i++) {
            depositorsAuroraShares += IAuroraStaking(stAurora).users[depositors[i]];
        }
        if (depositorsAuroraShares == 0) return 0;
        uint256 denominator = IAuroraStaking(stAurora).totalAuroraShares;
        if (denominator == 0) return 0;
        uint256 numerator = (depositorsAuroraShares *
            IAuroraStaking(stAurora).getTotalAmountOfStakedAurora());
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }

    function totalAssets() external returns (uint256) {
        return getTotalAssetsFromDepositors() + lpTotalAsset;
    }
}
