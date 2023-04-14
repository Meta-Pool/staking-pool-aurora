// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

enum StreamStatus {
    INACTIVE,
    PROPOSED,
    ACTIVE
}

interface IAuroraStaking {
    function getPending(uint256 _streamId, address _account) external view returns (uint256);
    function getReleaseTime(uint256 _streamId, address _account) external view returns (uint256);
    function getStream(uint256 _streamId) external view returns (
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
    );
    function getTotalAmountOfStakedAurora() external view returns (uint256);
    function getUserShares(address _account) external view returns (uint256);
    function moveRewardsToPending(uint256 _streamId) external;
    function stake(uint256 _amount) external;
    function totalAuroraShares() external view returns (uint256);
    function unstake(uint256 _amount) external;
    function unstakeAll() external;
    function withdraw(uint256 _streamId) external;

}