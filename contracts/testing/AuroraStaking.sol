// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

contract AuroraStaking {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address immutable auroraToken;
    uint256 public touchedAt;
    uint256 public totalAmountOfStakedAurora;
    uint256 public totalAuroraShares;

    mapping(address => uint256) deposits;
    mapping(address => uint256) auroraShares;

    constructor(address _auroraToken) {
        auroraToken = _auroraToken;
        touchedAt = block.timestamp;
    }

    // /// @dev moves the reward for specific stream Id to pending rewards.
    // /// It will require a waiting time untill it get released. Users call
    // /// this in function in order to claim rewards.
    // /// @param streamId stream index
    // function moveRewardsToPending(uint256 streamId) external {
    //     _before();
    //     _moveRewardsToPending(msg.sender, streamId);
    // }

    //     /// @dev moves all the user rewards to pending reward.
    // function moveAllRewardsToPending() external {
    //     _before();
    //     // Claim all streams while skipping inactive streams.
    //     _moveAllRewardsToPending(msg.sender);
    // }

    // /// @dev moves a set of stream Id rewards to pending.
    // /// Allows user to select stream ids to claim from UI.
    // /// @param streamIds stream indexes
    // function batchMoveRewardsToPending(uint256[] calldata streamIds)
    //     external
    // {
    //     _before();
    //     _batchClaimRewards(msg.sender, streamIds);
    // }

    // /// @dev a user stakes amount of AURORA tokens
    // /// The user should approve these tokens to the treasury
    // /// contract in order to complete the stake.
    // /// @param amount is the AURORA amount.
    // function stake(uint256 amount) external {
    //     IERC20(auroraToken).transferFrom(msg.sender, address(this), amount);
    //     balances[msg.sender] += amount;
    // }

    // /// @dev withdraw amount in the pending pool. User should wait for
    // /// pending time (tau constant) in order to be able to withdraw.
    // /// @param streamId stream index
    // function withdraw(uint256 streamId) external {
    //     require(
    //         block.timestamp > users[msg.sender].releaseTime[streamId],
    //         "INVALID_RELEASE_TIME"
    //     );
    //     _withdraw(streamId);
    // }

    // /// @dev withdraw all claimed balances which have passed pending periode.
    // /// This function will reach gas limit with too many streams,
    // /// so the frontend will allow individual stream withdrawals and disable withdrawAll.
    // function withdrawAll() external {
    //     User storage userAccount = users[msg.sender];
    //     uint256 streamsLength = streams.length;
    //     for (uint256 i = 0; i < streamsLength; i++) {
    //         if (
    //             userAccount.pendings[i] != 0 &&
    //             block.timestamp > userAccount.releaseTime[i]
    //         ) {
    //             _withdraw(i);
    //         }
    //     }
    // }

    // /// @dev withdraw a set of stream Ids.
    // /// Allows user to select stream ids to withdraw from UI.
    // /// @param streamIds to withdraw.
    // function batchWithdraw(uint256[] calldata streamIds) external {
    //     User storage userAccount = users[msg.sender];
    //     for (uint256 i = 0; i < streamIds.length; i++) {
    //         if (
    //             userAccount.pendings[streamIds[i]] != 0 &&
    //             block.timestamp > userAccount.releaseTime[streamIds[i]]
    //         ) {
    //             _withdraw(streamIds[i]);
    //         }
    //     }
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

        // 1 second == 0.01 Aurora reward
        uint256 factor = (block.timestamp - lastUpdate) * (10 ** 16);
        return factor;
    }

    /// @dev gets the total amount of staked aurora
    /// @return totalAmountOfStakedAurora + latest reward schedule
    function getTotalAmountOfStakedAurora() external view returns (uint256) {
        return totalAmountOfStakedAurora + getRewardsAmount(0, touchedAt);
    }

    /// @dev a user stakes amount of AURORA tokens
    /// The user should approve these tokens to the treasury
    /// contract in order to complete the stake.
    /// @param amount is the AURORA amount.
    function stake(uint256 amount) external {
        _before();

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

        auroraShares[msg.sender] += _amountOfShares;
        totalAuroraShares += _amountOfShares;
        totalAmountOfStakedAurora += amount;
        deposits[msg.sender] += amount;

        IERC20Upgradeable(auroraToken).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
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
}