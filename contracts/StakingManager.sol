// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IAuroraStaking {

    // struct User {
    //     uint256 deposit;
    //     uint256 auroraShares;
    //     uint256 streamShares;
    //     mapping(uint256 => uint256) pendings; // The amount of tokens pending release for user per stream
    //     mapping(uint256 => uint256) releaseTime; // The release moment per stream
    //     mapping(uint256 => uint256) rpsDuringLastClaim; // RPS or reward per share during the previous rewards claim
    // }
    
    // mapping(address => User) public users;

    function totalAuroraShares() external view returns (uint256);
    function getUserShares(address account) external view returns (uint256);
    function getTotalAmountOfStakedAurora() external view returns (uint256);
}


contract StakingManager is AccessControl {

    bytes32 public constant DEPOSITORS_OWNER_ROLE = keccak256("DEPOSITORS_OWNER_ROLE");

    address immutable public stAurora;
    address immutable public auroraToken;
    address immutable public auroraStaking;

    address[] public depositors;
    address public nextDepositor;
    mapping(address => uint256) depositorShares;

    uint256 public lpTotalAsset;
    uint256 public lpTotalShare;

    modifier onlyStAurora() {
        require(msg.sender == stAurora);
        _;
    }

    constructor(
        address _stAurora,
        address _auroraStaking,
        address _depositor_owner
    ) {
        require(_stAurora != address(0) && _auroraStaking != address(0) && _depositor_owner != address(0));
        stAurora = _stAurora;
        auroraStaking = _auroraStaking;
        auroraToken = IERC4626(stAurora).asset();

        _grantRole(DEPOSITORS_OWNER_ROLE, _depositor_owner);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function isAdmin(address _address) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _address);
    }

    function isDepositorsOwner(address _address) public view returns (bool) {
        return hasRole(DEPOSITORS_OWNER_ROLE, _address);
    }

    function insertDepositor(address _depositor) external onlyRole(DEPOSITORS_OWNER_ROLE) {
        depositors.push(_depositor);
        nextDepositor = _depositor;
    }

    function depositorsLength() external view returns (uint256) {
        return depositors.length;
    }

    function getDepositorShares(address _depositor) external view returns (uint256) {
        return depositorShares[_depositor];
    }

    function depositorExists(address _depositor) public view returns (bool) {
        for (uint i = 0; i < depositors.length; i++) {
            if (depositors[i] == _depositor) {
                return true;
            }
        }
        return false;
    }

    function updateDepositorShares(address _depositor) public {
        require(depositors.length > 0);
        require(depositorExists(_depositor), "UNEXISTING_DEPOSITOR");
        depositorShares[_depositor] = IAuroraStaking(auroraStaking).getUserShares(_depositor);
    }

    function setNextDepositor() public onlyStAurora {
        require(depositors.length > 0);
        updateDepositorShares(nextDepositor);
        address _nextDepositor = depositors[0];
        for (uint i = 0; i < depositors.length; i++) {
            // Keeping a < instead of <= allows prioritizing the deposits in lower index depositors.
            if (depositorShares[depositors[i]] < depositorShares[_nextDepositor] ) {
                _nextDepositor = depositors[i];
            }
        }
        nextDepositor = _nextDepositor;
    }

    function getTotalAssetsFromDepositors() public view returns (uint256) {
        uint256 arrayLength = depositors.length;
        uint256 depositorsAuroraShares = 0;
        IAuroraStaking auroraContract = IAuroraStaking(auroraStaking);

        if (arrayLength == 0) return 0;
        for (uint i=0; i<arrayLength; i++) {
            depositorsAuroraShares += depositorShares[depositors[i]];
        }
        if (depositorsAuroraShares == 0) return 0;
        uint256 denominator = auroraContract.totalAuroraShares();
        if (denominator == 0) return 0;
        uint256 numerator = (depositorsAuroraShares *
            auroraContract.getTotalAmountOfStakedAurora());
        uint256 stakeValue = numerator / denominator;
        return stakeValue;
    }

    function totalAssets() external view returns (uint256) {
        return getTotalAssetsFromDepositors() + lpTotalAsset;
    }
}
