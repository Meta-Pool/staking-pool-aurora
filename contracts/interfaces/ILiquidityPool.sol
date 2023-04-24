// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ILiquidityPool {
    event AddLiquidity(address indexed _sender, address indexed _receiver, uint256 _shares, uint256 _auroraAmount);
    event ContractUpdateOperation(address indexed _sender, bool _isFullyOperational);
    event RemoveLiquidity(address indexed _sender, address indexed _receiver, address indexed _owner, uint256 _shares, uint256 _auroraAmount, uint256 _stAurAmount);
    event SwapStAur(address indexed _user, uint256 _auroraAmount, uint256 _stAurAmount, uint256 _fee);
    event UpdateFeeBasisPoints(address indexed _sender, uint256 _old, uint256 _new);
    event UpdateLiqProvFeeBasisPoints(address indexed _sender, uint256 _old, uint256 _new);
    event UpdateMinDepositAmount(address indexed _sender, uint256 _old, uint256 _new);
    event WithdrawCollectedFees(address indexed _sender, address _receiver, uint256 _amount);

    function isStAurBalanceAvailable(uint _amount) external view returns(bool);
    function previewSwapStAurForAurora(uint256 _amount) external view returns (uint256);
    function swapStAurForAurora(uint256 _stAurAmount, uint256 _minAuroraToReceive) external;
    function transferStAur(address _receiver, uint256 _amount, uint _assets) external;
}