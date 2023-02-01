// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

contract AuroraPlus {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address immutable auroraToken;
    uint256 immutable deployTimestamp;
    uint256 totalAmountOfStakedAurora;

    mapping(address => uint256) deposits;

    constructor(address _auroraToken) {
        auroraToken = _auroraToken;
        deployTimestamp = block.timestamp;

        totalAmountOfStakedAurora = 10_000 * (10 ** 18);
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
        return deposits[account];
    }

    /// @dev gets the total amount of staked aurora
    /// @return totalAmountOfStakedAurora + latest reward schedule
    function getTotalAmountOfStakedAurora() external view returns (uint256) {
        // 1 second == 0.01 Aurora reward
        uint256 factor = (block.timestamp - deployTimestamp) * (10 ** 16);
        return totalAmountOfStakedAurora + factor;
    }

    /// @dev a user stakes amount of AURORA tokens
    /// The user should approve these tokens to the treasury
    /// contract in order to complete the stake.
    /// @param amount is the AURORA amount.
    function stake(uint256 amount) external {
        deposits[msg.sender] += amount;


        // _before();
        // _stake(msg.sender, amount);
        // IERC20Upgradeable(auroraToken).safeTransferFrom(
        //     msg.sender,
        //     address(treasury),
        //     amount
        // );
    }
}