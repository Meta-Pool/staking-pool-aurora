//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "./StAuroraToken.sol";
import "hardhat/console.sol";

contract StakingPoolAurora is StAuroraToken {
    /// Owner's account ID (it will be a DAO on phase II)
    address public owner_account_id;

    /// Avoid re-entry when async-calls are in-flight
    bool public contract_busy;

    /// no auto-staking. true while changing staking pools
    bool public staking_paused;

    /// What should be the contract_account_balance according to our internal accounting (if there's extra, it is 30% tx-fees)
    /// This amount increments with attachedNEAR calls (inflow) and decrements with deposit_and_stake calls (outflow)
    /// increments with retrieve_from_staking_pool (inflow) and decrements with user withdrawals from the contract (outflow)
    /// It should match env::balance()
    uint256 public contract_account_balance;

    /// Every time a user performs a delayed-unstake, stNEAR tokens are burned and the user gets a unstaked_claim that will
    /// be fulfilled 4 epochs from now. If there are someone else staking in the same epoch, both orders (stake & d-unstake) cancel each other
    /// (no need to go to the staking-pools) but the NEAR received for staking must be now reserved for the unstake-withdraw 4 epochs form now.
    /// This amount increments *after* end_of_epoch_clearing, *if* there are staking & unstaking orders that cancel each-other.
    /// This amount also increments at retrieve_from_staking_pool
    /// The funds here are *reserved* for the unstake-claims and can only be used to fulfill those claims
    /// This amount decrements at unstake-withdraw, sending the NEAR to the user
    /// Note: There's a extra functionality (quick-exit) that can speed-up unstaking claims if there's funds in this amount.
    uint256 public reserve_for_unstake_claims;

    /// This value is equivalent to sum(accounts.available)
    /// This amount increments with user's deposits_into_available and decrements when users stake_from_available
    /// increments with unstake_to_available and decrements with withdraw_from_available
    /// Note: in the current simplified UI user-flow of the meta-pool, only the NSLP & the treasury can have available balance
    /// the rest of the users mov directly between their NEAR native accounts & the contract accounts, only briefly occupying acc.available
    uint256 public total_available;

    //-- ORDERS
    /// The total amount of "stake" orders in the current epoch
    uint256 public epoch_stake_orders;
    /// The total amount of "delayed-unstake" orders in the current epoch
    uint256 public epoch_unstake_orders;
    // this two amounts can cancel each other at end_of_epoch_clearing
    /// The epoch when the last end_of_epoch_clearing was performed. To avoid calling it twice in the same epoch.
    uint256 public epoch_last_clearing;

    /// The total amount of tokens selected for staking by the users
    /// not necessarily what's actually staked since staking can is done in batches
    /// Share price is computed using this number. share_price = total_for_staking/total_shares
    uint256 public total_for_staking;

    /// The total amount of tokens actually staked (the tokens are in the staking pools)
    // During distribute_staking(), If !staking_paused && total_for_staking<total_actually_staked, then the difference gets staked in the pools
    // During distribute_unstaking(), If total_actually_staked>total_for_staking, then the difference gets unstaked from the pools
    uint256 public total_actually_staked;

    /// how many "shares" were minted. Every time someone "stakes" he "buys pool shares" with the staked amount
    // the buy share price is computed so if she "sells" the shares on that moment she recovers the same near amount
    // staking produces rewards, rewards are added to total_for_staking so share_price will increase with rewards
    // share_price = total_for_staking/total_shares
    // when someone "unstakes" they "burns" X shares at current price to recoup Y near
    uint256 public total_stake_shares; //total stNEAR minted

    /// META is the governance token. Total meta minted
    // uint256 public total_meta;

    /// The total amount of tokens actually unstaked and in the waiting-delay (the tokens are in the staking pools)
    uint256 public total_unstaked_and_waiting;

    /// sum(accounts.unstake). Every time a user delayed-unstakes, this amount is incremented
    /// when the funds are withdrawn the amount is decremented.
    /// Control: total_unstaked_claims == reserve_for_unstaked_claims + total_unstaked_and_waiting
    uint256 public total_unstake_claims;

    /// the staking pools will add rewards to the staked amount on each epoch
    /// here we store the accumulated amount only for stats purposes. This amount can only grow
    uint256 public accumulated_staked_rewards;

    /// user's accounts
    mapping(address => Account) public accounts;

    /// list of pools to diversify in
    // pub staking_pools: Vec<StakingPoolInfo>,

    // validator loan request
    // action on audit suggestions, this field is not used. No need for this to be on the main contract
    // pub loan_requests: LookupMap<AccountId, VLoanRequest>,

    //The next 3 values define the Liq.Provider fee curve
    // NEAR/stNEAR Liquidity pool fee curve params
    // We assume this pool is always UNBALANCED, there should be more NEAR than stNEAR 99% of the time
    ///NEAR/stNEAR Liquidity target. If the Liquidity reach this amount, the fee reaches nslp_min_discount_basis_points
    uint256 public nslp_liquidity_target; // 150_000*NEAR initially
    ///NEAR/stNEAR Liquidity pool max fee
    uint16 public nslp_max_discount_basis_points; //5% initially
    ///NEAR/stNEAR Liquidity pool min fee
    uint16 public nslp_min_discount_basis_points; //0.5% initially

    // //The next 3 values define meta rewards multipliers. (10 => 1x, 20 => 2x, ...)
    // ///for each stNEAR paid staking reward, reward stNEAR holders with META. default:5x. reward META = rewards * (mult_pct*10) / 100
    // uint16 public staker_meta_mult_pct;
    // ///for each stNEAR paid as discount, reward stNEAR sellers with META. default:1x. reward META = discounted * (mult_pct*10) / 100
    // uint16 public stnear_sell_meta_mult_pct;
    // ///for each stNEAR paid as discount, reward LP providers  with META. default:20x. reward META = fee * (mult_pct*10) / 100
    // uint16 public lp_provider_meta_mult_pct;

    /// min amount accepted as deposit or stake
    uint256 public min_deposit_amount;

    address public aurora_token;

    /// Operator account ID (who's in charge to call distribute_xx() on a periodic basis)
    address public operator_account_id;
    /// operator_rewards_fee_basis_points. (0.2% default) 100 basis point => 1%. E.g.: owner_fee_basis_points=30 => 0.3% owner's fee
    uint16 public operator_rewards_fee_basis_points;
    /// owner's cut on Liquid Unstake fee (3% default)
    uint16 public operator_swap_cut_basis_points;
    /// Treasury account ID (it will be controlled by a DAO on phase II)
    address public treasury_account_id;
    /// treasury cut on Liquid Unstake (25% from the fees by default)
    uint16 public treasury_swap_cut_basis_points;

    // Configurable info for [NEP-129](https://github.com/nearprotocol/NEPs/pull/129)
    // pub web_app_url: Option<String>,
    // pub auditor_account_id: Option<AccountId>,

    /// Where's the NEP-141 $META token contract
    // address public meta_token_account_id;

    // estimated & max meta rewards for each category
    // pub est_meta_rewards_stakers: u128,
    // pub est_meta_rewards_lu: u128, //liquid-unstakers
    // pub est_meta_rewards_lp: u128, //liquidity-providers
    // max. when this amount is passed, corresponding multiplier is damped proportionally
    // pub max_meta_rewards_stakers: u128,
    // pub max_meta_rewards_lu: u128, //liquid-unstakers
    // pub max_meta_rewards_lp: u128, //liquidity-providers

    // Good old MetaPool contract ends here -----------------------------------------------------

    struct RewardMeter {
        ///added with staking
        ///subtracted on unstaking. WARN: Since unstaking can include rewards, delta_staked *CAN BECOME NEGATIVE*
        int256 delta_staked; //i128 changing this requires accounts migration
        uint16 last_multiplier_pct; // (pct: 100 => x1, 200 => x2)
    }

    struct Account {
        /// This amount increments with deposits and decrements with for_staking
        /// increments with complete_unstake and decrements with user withdrawals from the contract
        /// withdrawals from the pools can include rewards
        /// since staking is delayed and in batches it only eventually matches env::balance()
        /// total = available + staked + unstaked
        /// Note: In the simplified user-UI, the basic-user always does deposit-and-stake and sell/unstake that goes directly to their wallet
        /// so the only users of this field are lockup-contracts and advanced-users when they perform "Classic Unstakes"
        uint256 available;

        /// The amount of st_near (stake shares) of the total staked balance in the pool(s) this user owns.
        /// When someone stakes, share-price is computed and shares are "sold" to the user so he only owns what he's staking and no rewards yet
        /// When a user request a transfer to other user, shares from the origin are moved to shares of the destination
        /// The share_price can be computed as total_for_staking/total_stake_shares
        /// stNEAR price = total_for_staking/total_stake_shares
        uint256 stake_shares; //st_near this account owns

        /// Incremented when the user asks for Delayed-Unstaking. The amount of unstaked near in the pools
        uint256 unstaked;

        /// The epoch height when the unstaked will be available
        /// The funds will be locked for -AT LEAST- NUM_EPOCHS_TO_UNLOCK epochs
        uint256 unstaked_requested_unlock_epoch;

        //-- META
        ///realized META, can be used to transfer META from one user to another
        // Total META = realized_meta + staking_meter.mul_rewards(valued_stake_shares) + lp_meter.mul_rewards(valued_lp_shares)
        // Every time the user operates on STAKE/UNSTAKE: we realize meta: realized_meta += staking_meter.mul_rewards(valued_staked_shares)
        // Every time the user operates on ADD.LIQ/REM.LIQ.: we realize meta: realized_meta += lp_meter.mul_rewards(valued_lp_shares)
        // if the user calls farm_meta() we perform both
        // pub realized_meta: u128,
        ///Staking rewards meter (to mint stNEAR for the user)
        RewardMeter staking_meter;
        ///LP fee gains meter (to mint meta for the user)
        // RewardMeter lp_meter;

        //-- STATISTICAL DATA --
        // User's statistical data
        // This is the user-controlled staking rewards meter, it works as a car's "trip meter". The user can reset them to zero.
        // to compute trip_rewards we start from current_stnear, undo unstakes, undo stakes and finally subtract trip_start_stnear
        // trip_rewards = current_stnear + trip_accum_unstakes - trip_accum_stakes - trip_start_stnear;
        /// trip_start: (timestamp in milliseconds) this field is set at account creation, so it will start metering rewards
        uint64 trip_start;

        /// OBSOLETE - How much stnear the user had at "trip_start".
        // uint256 trip_start_stnear;
        // how much stnear the staked since trip start (minus unstaked)
        uint128 trip_accum_stakes;
        // how much the user unstaked since trip start (zeroed if there was stake)
        uint128 trip_accum_unstakes;

        ///NS liquidity pool shares, if the user is a liquidity provider
        uint128 nslp_shares;
    }

    constructor(
        address _owner,
        address _treasury,
        address _operator,
        address _aurora_token,
        string memory st_aurora_name,
        string memory st_aurora_symbol
    ) StAuroraToken(st_aurora_name, st_aurora_symbol) {
        console.log("Are we here?");
        owner_account_id = _owner;
        contract_busy = false;
        operator_account_id = _operator;
        treasury_account_id = _treasury;
        aurora_token = _aurora_token;
        contract_account_balance = 0;

        uint16 DEFAULT_OPERATOR_REWARDS_FEE_BASIS_POINTS = 0;
        operator_rewards_fee_basis_points = DEFAULT_OPERATOR_REWARDS_FEE_BASIS_POINTS;
        
        uint16 DEFAULT_OPERATOR_SWAP_CUT_BASIS_POINTS = 0;
        operator_swap_cut_basis_points = DEFAULT_OPERATOR_SWAP_CUT_BASIS_POINTS;

        uint16 DEFAULT_TREASURY_SWAP_CUT_BASIS_POINTS = 0;
        treasury_swap_cut_basis_points = DEFAULT_TREASURY_SWAP_CUT_BASIS_POINTS;

        staking_paused = false;
        total_available = 0;
        total_for_staking = 0;
        total_actually_staked = 0;
        total_unstaked_and_waiting = 0;
        reserve_for_unstake_claims = 0;
        total_unstake_claims = 0;
        epoch_stake_orders = 0;
        epoch_unstake_orders = 0;
        epoch_last_clearing = 0;
        accumulated_staked_rewards = 0;
        total_stake_shares = 0;
 
        nslp_liquidity_target = 10_000 * (10 ** 18);
        nslp_max_discount_basis_points = 180; //1.8%
        nslp_min_discount_basis_points = 25; //0.25%
        min_deposit_amount = 10 * (10 ** 18);

    }
}