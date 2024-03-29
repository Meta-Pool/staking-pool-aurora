// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

// import "hardhat/console.sol"; // This is a testing contract.

contract AuroraStaking {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address immutable auroraToken;
    uint256 public touchedAt;
    uint256 public totalAmountOfStakedAurora;
    uint256 public totalAuroraShares;
    uint256 public tauAuroraStream;

    /// @dev Centauri Token for Rewards >> Stream 1 <<
    address public centauriToken;
    uint256 public tauCentauriStream;

    mapping(address => uint256) deposits;
    mapping(address => uint256) auroraShares;
    mapping(address => mapping(uint256 => uint256)) pendings;
    mapping(address => mapping(uint256 => uint256)) releaseTime;

    /// @dev Testing parameter to help the test of the withdraw with some stress.
    bool public failAtSecondWithdraw;
    bool public failAtNextWithdraw;

    enum StreamStatus {
        INACTIVE,
        PROPOSED,
        ACTIVE
    }

    modifier onlyValidSharesAmount() {
        require(totalAuroraShares != 0, "ZERO_TOTAL_AURORA_SHARES");
        require(auroraShares[msg.sender] != 0, "ZERO_USER_SHARES");
        _;
    }

    constructor(address _auroraToken, address _centauriToken) {
        auroraToken = _auroraToken;
        touchedAt = block.timestamp;
        // tauAuroraStream = 2 * 24 * 60 * 60; // 2 days in seconds.
        tauAuroraStream = 1 * 60 * 60; // 1 hour in seconds.
        tauCentauriStream = 30 * 60; // 0.5 hour in seconds.
        centauriToken = _centauriToken;
    }

    function updateFailAtSecondWithdraw(bool _newValue) external {
        failAtSecondWithdraw = _newValue;
        if (!_newValue) { failAtNextWithdraw = false; }
    }

    /// @dev get the stream data
    /// @notice this function doesn't return the stream
    /// schedule due to some stake slots limitations. To
    /// get the stream schedule, refer to getStreamSchedule
    /// @param streamId the stream index
    function getStream(uint256 streamId)
        external
        view
        returns (
            address streamOwner,
            address rewardToken,
            uint256 auroraDepositAmount,
            uint256 auroraClaimedAmount,
            uint256 rewardDepositAmount,
            uint256 rewardClaimedAmount,
            uint256 maxDepositAmount,
            uint256 lastTimeOwnerClaimed,
            uint256 rps,
            uint256 tau,
            StreamStatus status
        )
    {
        if (streamId == 0) {
            return (
                address(0),
                auroraToken,
                streamId,
                0,
                0,
                0,
                0,
                0,
                0,
                tauAuroraStream,
                StreamStatus.ACTIVE
            );
        } else if (streamId == 1) {
            return (
                address(0),
                centauriToken,
                streamId,
                0,
                0,
                0,
                0,
                0,
                0,
                tauCentauriStream,
                StreamStatus.ACTIVE
            );
        } else {
            revert("INVALID_STREAM_ID");
        }
    }

    // /// @dev get the streams count
    // /// @return streams.length
    // function getStreamsCount() external view returns (uint256) {
    //     return 2;
    // }

    // function getStreamClaimableAmount(uint256 streamId, address account)
    //     external
    //     view
    //     returns (uint256) {
    //     return 0;
    // }

    /// @dev gets the total user deposit
    /// @param account the user address
    /// @return user total deposit in (AURORA)
    function getUserTotalDeposit(address account)
        external
        view
        returns (uint256)
    {
        return deposits[account];
    }

    /// @dev gets the user shares
    /// @param account the user address
    /// @return user shares
    function getUserShares(address account) external view returns (uint256) {
        return auroraShares[account];
    }

    /// @dev calculates and gets the latest released rewards.
    /// @param streamId stream index
    /// @return rewards released since last update.
    function getRewardsAmount(uint256 streamId, uint256 lastUpdate)
        public
        view
        returns (uint256)
    {
        require(streamId == 0);
        require(lastUpdate <= block.timestamp, "INVALID_LAST_UPDATE");
        if (lastUpdate == block.timestamp) return 0; // No more rewards since last update

        // 1 second == 0.0001 Aurora reward
        uint256 factor = (block.timestamp - lastUpdate) * (10 ** 14);
        return factor;
    }

    /// @dev gets the total amount of staked aurora
    /// @return totalAmountOfStakedAurora + latest reward schedule
    function getTotalAmountOfStakedAurora() external view returns (uint256) {
        return totalAmountOfStakedAurora + getRewardsAmount(0, touchedAt);
    }

    /// @dev gets the user's stream reward release time
    /// @param streamId stream index
    /// @param account user account
    /// @return user.releaseTime[streamId]
    function getReleaseTime(uint256 streamId, address account)
        external
        view
        returns (uint256)
    {
        return releaseTime[account][streamId];
    }

    /// @dev withdraw amount in the pending pool. User should wait for
    /// pending time (tau constant) in order to be able to withdraw.
    /// @param streamId stream index
    function withdraw(uint256 streamId) external {
        require(
            block.timestamp > releaseTime[msg.sender][streamId],
            "INVALID_RELEASE_TIME"
        );
        _withdraw(streamId);
    }

    /// @dev a user stakes amount of AURORA tokens
    /// The user should approve these tokens to the treasury
    /// contract in order to complete the stake.
    /// @param amount is the AURORA amount.
    function stake(uint256 amount) external {
        _before();
        _stake(msg.sender, amount);
        IERC20Upgradeable(auroraToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
    }

    /// @dev unstake amount from user shares value. The rest is re-staked
    /// @param amount to unstake
    function unstake(uint256 amount)
        external
        onlyValidSharesAmount
    {
        _before();
        uint256 stakeValue = (totalAmountOfStakedAurora *
            auroraShares[msg.sender]) / totalAuroraShares;
        _unstake(amount, stakeValue);
    }

    /// @dev unstake all the user's shares
    function unstakeAll() external onlyValidSharesAmount {
        _before();
        uint256 stakeValue = (totalAmountOfStakedAurora *
            auroraShares[msg.sender]) / totalAuroraShares;
        _unstake(stakeValue, stakeValue);
    }

    /// @dev gets the user's stream pending reward
    /// @param streamId stream index
    /// @param account user account
    /// @return user.pendings[streamId]
    function getPending(uint256 streamId, address account)
        external
        view
        returns (uint256)
    {
        return pendings[account][streamId];
    }

    /// @dev called before touching the contract reserves (stake/unstake)
    function _before() internal {
        if (touchedAt == block.timestamp) return; // Already updated by previous tx in same block.
        if (totalAuroraShares != 0) {
            // Don't release rewards if there are no stakers.
            totalAmountOfStakedAurora += getRewardsAmount(0, touchedAt);
        }
        touchedAt = block.timestamp;
    }

    /// WARNING: rewards are not claimed during unstake.
    /// The UI must make sure to claim rewards before unstaking.
    /// Unclaimed rewards will be lost.
    /// `_before()` must be called before `_unstake` to update streams rps
    function _unstake(uint256 amount, uint256 stakeValue) internal {
        // console.log("failAtSecondWithdraw: %s", failAtSecondWithdraw);
        // console.log("failAtNextWithdraw: %s", failAtNextWithdraw);
        // console.log("---------");

        // TEST MECHANISM to make it fail at second withdraw.
        if (failAtSecondWithdraw) {
            if (failAtNextWithdraw) {
                require(1 == 2, "DUMMY_TEST_ERROR");
            } else {
                failAtNextWithdraw = true;
            }
        }

        require(amount != 0, "ZERO_AMOUNT");
        require(amount <= stakeValue, "NOT_ENOUGH_STAKE_BALANCE");
        // User storage userAccount = users[msg.sender];
        // move rewards to pending
        // remove the shares from everywhere
        totalAuroraShares -= auroraShares[msg.sender];
        // totalStreamShares -= streamShares[msg.sender];
        auroraShares[msg.sender] = 0;
        // userAccount.streamShares = 0;
        // update the total Aurora staked and deposits
        totalAmountOfStakedAurora -= stakeValue;
        deposits[msg.sender] = 0;
        // move unstaked AURORA to pending.
        pendings[msg.sender][0] += amount;
        // userAccount.pendings[0] += amount;
        releaseTime[msg.sender][0] = block.timestamp + tauAuroraStream;
        // userAccount.releaseTime[0] = block.timestamp + streams[0].tau;
        // emit Pending(0, msg.sender, userAccount.pendings[0]);
        // emit Unstaked(msg.sender, amount);
        // restake the rest
        uint256 amountToRestake = stakeValue - amount;
        if (amountToRestake > 0) {
            _stake(msg.sender, amountToRestake);
        }
    }

    /// @dev calculate the shares for a user per AURORA stream and other streams
    /// @param amount the staked amount
    /// WARNING: rewards are not claimed during stake.
    /// The UI must make sure to claim rewards before adding more stake.
    /// Unclaimed rewards will be lost.
    /// `_before()` must be called before `_stake` to update streams rps
    /// compounded AURORA rewards.
    function _stake(address account, uint256 amount) internal {
        uint256 _amountOfShares = 0;
        if (totalAuroraShares == 0) {
            // initialize the number of shares (_amountOfShares) owning 100% of the stake (amount)
            _amountOfShares = amount;
        } else {
            uint256 numerator = amount * totalAuroraShares;
            _amountOfShares = numerator / totalAmountOfStakedAurora;
            // check that rounding is needed (result * denominator < numerator).
            if (_amountOfShares * totalAmountOfStakedAurora < numerator) {
                // Round up so users don't get less sharesValue than their staked amount
                _amountOfShares += 1;
            }
        }

        auroraShares[account] += _amountOfShares;
        totalAuroraShares += _amountOfShares;
        totalAmountOfStakedAurora += amount;
        deposits[account] += amount;
    }

    /// @dev withdraw stream rewards after the release time.
    /// @param streamId the stream index
    function _withdraw(uint256 streamId) internal {
        uint256 pendingAmount = pendings[msg.sender][streamId];
        pendings[msg.sender][streamId] = 0;
        if (streamId == 0) {
            IERC20Upgradeable(auroraToken).safeTransfer(msg.sender, pendingAmount);
        } else if (streamId == 1) {
            IERC20Upgradeable(centauriToken).safeTransfer(msg.sender, pendingAmount);
        } else {
            revert("INVALID_STREAM_ID");
        }
    }

    function moveRewardsToPending(uint256 streamId) external {
        require(auroraShares[msg.sender] != 0, "USER_DOES_NOT_HAVE_ACTUAL_STAKE");
        _before();

        // Dummy contract increase the rewards pending by 1.
        pendings[msg.sender][streamId] += 1 ether;
        releaseTime[msg.sender][streamId] = block.timestamp + tauCentauriStream;
    }
}