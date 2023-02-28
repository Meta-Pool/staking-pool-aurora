// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage of Hardhat Network's snapshot functionality.
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

// 1 AURORA
const AURORA = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(18));

// `describe` is a Mocha function that allows you to organize your tests.
// Having your tests organized makes debugging them easier. All Mocha
// functions are available in the global scope.
//
// `describe` receives the name of a section of your test suite, and a
// callback. The callback must define the tests of that section. This callback
// can't be an async function.
describe("Staking Pool AURORA", function () {
  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshot in every test.
  async function deployPoolFixture() {
    // Get the ContractFactory and Signers here.
    const AuroraToken = await ethers.getContractFactory("Token");
    const AuroraStaking = await ethers.getContractFactory("AuroraStaking");
    const StakingManager = await ethers.getContractFactory("StakingManager");
    const Depositor = await ethers.getContractFactory("Depositor");
    const StakedAuroraVault = await ethers.getContractFactory("StakedAuroraVault");
    const [
      owner,
      depositors_owner,
      treasury,
      operator,
      alice,
      bob,
      carl
    ] = await ethers.getSigners();

    const decimals = ethers.BigNumber.from(10).pow(18);
    const initialSupply = ethers.BigNumber.from(10_000_000).mul(decimals);
    const auroraTokenContract = await AuroraToken.deploy(
      initialSupply,
      "Aurora Token",
      "AURORA",
      alice.address
    );
    await auroraTokenContract.deployed();

    // Sharing total suply with Bob and Carl.
    const splitSupply = ethers.BigNumber.from(3_000_000).mul(decimals);
    await auroraTokenContract.connect(alice).transfer(bob.address, splitSupply);
    await auroraTokenContract.connect(alice).transfer(carl.address, splitSupply);

    const auroraStakingContract = await AuroraStaking.deploy(
      auroraTokenContract.address
    );
    await auroraStakingContract.deployed();

    // Send Tokens to the Aurora Staking contract to pay for rewards.
    const forRewards = ethers.BigNumber.from(1_000_000).mul(decimals);
    await auroraTokenContract.connect(alice).transfer(auroraStakingContract.address, forRewards);

    const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
    const stakedAuroraVaultContract = await StakedAuroraVault.deploy(
      auroraTokenContract.address,
      "Staked Aurora Token",
      "stAURORA",
      minDepositAmount
    );
    await stakedAuroraVaultContract.deployed();

    const stakingManagerContract = await StakingManager.deploy(
      stakedAuroraVaultContract.address,
      auroraStakingContract.address,
      depositors_owner.address,
      10
    );
    await stakingManagerContract.deployed();

    // Insert/update the staking manager in the ERC-4626
    await stakedAuroraVaultContract.updateStakingManager(stakingManagerContract.address);

    const depositor00Contract = await Depositor.connect(depositors_owner).deploy(
      stakingManagerContract.address
    );
    await depositor00Contract.deployed();

    const depositor01Contract = await Depositor.connect(depositors_owner).deploy(
      stakingManagerContract.address
    );
    await depositor01Contract.deployed();

    await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor00Contract.address);
    await stakingManagerContract.connect(depositors_owner).insertDepositor(depositor01Contract.address);

    // Fixtures can return anything you consider useful for your tests
    return {
      auroraTokenContract,
      auroraStakingContract,
      stakedAuroraVaultContract,
      stakingManagerContract,
      depositor00Contract,
      depositor01Contract,
      owner,
      depositors_owner,
      treasury,
      operator,
      alice,
      bob,
      carl,
      decimals
    };
  }

  async function depositPoolFixture() {
    const {
      auroraTokenContract,
      auroraStakingContract,
      stakedAuroraVaultContract,
      stakingManagerContract,
      depositor00Contract,
      depositor01Contract,
      owner,
      depositors_owner,
      treasury,
      operator,
      alice,
      bob,
      carl,
      decimals
    } = await loadFixture(deployPoolFixture);

    const aliceDeposit = ethers.BigNumber.from(6_000).mul(decimals);
    await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
    await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);

    const bobDeposit = ethers.BigNumber.from(100_000).mul(decimals);
    await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
    await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);

    const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
    await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
    await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

    await stakingManagerContract.cleanOrdersQueue();

    return {
      auroraTokenContract,
      auroraStakingContract,
      stakedAuroraVaultContract,
      stakingManagerContract,
      depositor00Contract,
      depositor01Contract,
      owner,
      depositors_owner,
      treasury,
      operator,
      alice,
      bob,
      carl,
      decimals
    };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define each
    // of your tests. It receives the test name, and a callback function.
    //
    // If the callback function is async, Mocha will `await` it.
    it("Should be correct for all contracts initial parameters.", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        owner,
        depositors_owner
      } = await loadFixture(deployPoolFixture);

      expect(await stakedAuroraVaultContract.owner()).to.equal(owner.address);
      expect(await stakedAuroraVaultContract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await stakedAuroraVaultContract.asset()).to.equal(auroraTokenContract.address);
      expect(await stakedAuroraVaultContract.totalAssets()).to.equal(0);

      expect(await stakingManagerContract.isAdmin(owner.address)).to.be.true;
      expect(await stakingManagerContract.isDepositorsOwner(depositors_owner.address)).to.be.true;
      expect(await stakingManagerContract.stAurora()).to.equal(stakedAuroraVaultContract.address);
      expect(await stakingManagerContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await stakingManagerContract.auroraStaking()).to.equal(auroraStakingContract.address);
      expect(await stakingManagerContract.depositorsLength()).to.equal(2);
      expect(await stakingManagerContract.totalAssets()).to.equal(0);

      expect(await depositor00Contract.owner()).to.equal(depositors_owner.address);
      expect(await depositor00Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor00Contract.stAurora()).to.equal(stakedAuroraVaultContract.address);
      expect(await depositor00Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor00Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await depositor01Contract.owner()).to.equal(depositors_owner.address);
      expect(await depositor01Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor01Contract.stAurora()).to.equal(stakedAuroraVaultContract.address);
      expect(await depositor01Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor01Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await auroraTokenContract.decimals()).to.equal(
        await stakedAuroraVaultContract.decimals());
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob and Carl.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        alice,
        bob,
        carl
      } = await loadFixture(deployPoolFixture);
      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      const stakingBalance = await auroraTokenContract.balanceOf(auroraStakingContract.address);
      expect(await auroraTokenContract.totalSupply()).to.equal(
        aliceBalance.add(bobBalance).add(carlBalance).add(stakingBalance));
    });
  });

  describe("Staking Aurora tokens", function () {
    it("Should allow deposits from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(deployPoolFixture);

      const aliceDeposit = ethers.BigNumber.from(100_000).mul(decimals);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, aliceDeposit);
      await stakedAuroraVaultContract.connect(alice).deposit(aliceDeposit, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(aliceDeposit)
      );
      // First deposit is equal to the deposited asset.
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      // First deposit must go ALL to Depositor 01.
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.equal(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.equal(0);

      const bobDeposit = ethers.BigNumber.from(6_000).mul(decimals);
      await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address, bobDeposit);
      await stakedAuroraVaultContract.connect(bob).deposit(bobDeposit, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(bobDeposit)
      );
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.be.lessThan(bobDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.be.greaterThan(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.equal(bobDeposit);

      const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(
        await stakedAuroraVaultContract.previewDeposit(carlDeposit)
      );
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.lessThan(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address)
      ).to.be.greaterThan(aliceDeposit);
      expect(
        await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address)
      ).to.greaterThan(bobDeposit.add(carlDeposit));
    });

    it("Should allow minting from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(deployPoolFixture);

      // CONSIDER: since the testing-aurora-staking is being revalued every second,
      // we need to approve more tokens than the returned by previewMint.
      const extraToken = ethers.BigNumber.from(1).mul(decimals);

      const aliceMint = ethers.BigNumber.from(1).mul(decimals);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(aliceMint.add(extraToken)));
      await stakedAuroraVaultContract.connect(alice).mint(aliceMint, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceMint);
      // First deposit is equal to the deposited asset.
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(aliceMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const bobMint = ethers.BigNumber.from(4).mul(decimals);
      await auroraTokenContract.connect(bob).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(bobMint.add(extraToken)));
      await stakedAuroraVaultContract.connect(bob).mint(bobMint, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(bobMint);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.be.equal(bobMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const carlDeposit = ethers.BigNumber.from(60).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address,
        await stakedAuroraVaultContract.previewMint(carlDeposit.add(extraToken)));
      await stakedAuroraVaultContract.connect(carl).mint(carlDeposit, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(carlDeposit);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.be.equal(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
    });

    it("Should not allow less than min deposit amount", async function () {
      const {
          stakedAuroraVaultContract,
          auroraTokenContract,
          alice,
          decimals
      } = await loadFixture(deployPoolFixture);

      const amountToDeposit = ethers.BigNumber.from(1).mul(decimals).sub(1);
      await auroraTokenContract.connect(alice).approve(stakedAuroraVaultContract.address, amountToDeposit);

      // First, by direct deposit.
      await expect(
        stakedAuroraVaultContract.connect(alice).deposit(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");

      // Then, by minting shares.
      await expect(
        stakedAuroraVaultContract.connect(alice).mint(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");
    });
  });

  describe("Redeem and withdraw TOTAL Aurora tokens", function () {
    it("Should allow redeem and withdraw assets from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(depositPoolFixture);

      // console.log("Total assets 1: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 1: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 1: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply0 = await stakedAuroraVaultContract.totalSupply();
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      expect(aliceShares).to.be.greaterThan(0);
      const aliceLessAssets = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(alice.address)).to.equal(0);


      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      expect(await stakedAuroraVaultContract.balanceOf(alice.address)).to.equal(0);
      // CONSIDER: Alice assets in the withdraw-order are greater than last call
      // due to the fast (every second) price increase.
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(alice.address)
      ).to.be.greaterThanOrEqual(aliceLessAssets);

      // console.log("Total assets 2: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 2: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 2: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply1 = await stakedAuroraVaultContract.totalSupply();
      expect(supply1).to.be.lessThan(supply0);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      expect(bobShares).to.be.greaterThan(0);
      const bobLessAssets = await stakedAuroraVaultContract.previewRedeem(bobShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(bob.address)).to.equal(0);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      expect(await stakedAuroraVaultContract.balanceOf(bob.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(bob.address)
      ).to.be.greaterThanOrEqual(bobLessAssets);

      // console.log("Total assets 3: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 3: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 3: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      const supply2 = await stakedAuroraVaultContract.totalSupply();
      expect(supply2).to.be.lessThan(supply1);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      expect(carlShares).to.be.greaterThan(0);
      const carlLessAssets = await stakedAuroraVaultContract.previewRedeem(carlShares);
      expect(await stakingManagerContract.getWithdrawOrderAssets(carl.address)).to.equal(0);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);
      expect(await stakedAuroraVaultContract.balanceOf(carl.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(carl.address)
      ).to.be.greaterThanOrEqual(carlLessAssets);

      // /// Original deposits.
      // const aliceDeposit = ethers.BigNumber.from(6_000).mul(decimals);
      // const bobDeposit = ethers.BigNumber.from(100_000).mul(decimals);
      // const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
      // const aliceCurrAssets = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      // const bobCurrAssets = await stakedAuroraVaultContract.previewRedeem(bobShares);
      // const carlCurrAssets = await stakedAuroraVaultContract.previewRedeem(carlShares);
      // console.log("alice current assets: %s", aliceCurrAssets);
      // console.log("alice original depos: %s", aliceDeposit);
      // console.log("alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("bob   current assets: %s", bobCurrAssets);
      // console.log("bob   original depos: %s", bobDeposit);
      // console.log("bob   withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("carl  current assets: %s", carlCurrAssets);
      // console.log("carl  original depos: %s", carlDeposit);
      // console.log("carl  withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(carl.address));
      // console.log("Total assets 4: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 4: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 4: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));

      const supply3 = await stakedAuroraVaultContract.totalSupply();
      expect(supply3).to.be.lessThan(supply2);
      expect(await stakingManagerContract.getTotalWithdrawInQueue()).to.equal(
        (
          await stakingManagerContract.getWithdrawOrderAssets(alice.address)
        ).add(
          await stakingManagerContract.getWithdrawOrderAssets(bob.address)
        ).add(
          await stakingManagerContract.getWithdrawOrderAssets(carl.address)
        )
      );

      await expect(
        stakingManagerContract.cleanOrdersQueue()
      ).to.be.revertedWith("WAIT_FOR_NEXT_CLEAN_ORDER");
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      // console.log("Total assets 5: %s", await stakedAuroraVaultContract.totalAssets());
      // console.log("Total supply 5: %s", await stakedAuroraVaultContract.totalSupply());
      // console.log("Aurora Staking Balance 5: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      // console.log("Staker Manager Balance 5: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));

      // The total Supply should drop to zero, but some assets will remain due to
      // the fast stAurora repricing.
      expect(await stakedAuroraVaultContract.totalSupply()).to.equal(0);
      expect(await stakedAuroraVaultContract.totalAssets()).to.be.lessThan(AURORA);
      expect(await stakingManagerContract.totalAssets()).to.be.lessThan(AURORA);

      const alicePending = await stakingManagerContract.getPendingOrderAssets(alice.address);
      const bobPending = await stakingManagerContract.getPendingOrderAssets(bob.address);
      const carlPending = await stakingManagerContract.getPendingOrderAssets(carl.address);
      expect(alicePending).to.be.greaterThan(0);
      expect(bobPending).to.be.greaterThan(0);
      expect(carlPending).to.be.greaterThan(0);

      // Staking Manager should not have any Aurora until assets are moved from the depositors.
      expect(await auroraTokenContract.balanceOf(stakingManagerContract.address)).to.equal(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      // console.log("Aurora Staking Balance 6: %s", await auroraTokenContract.balanceOf(auroraStakingContract.address));
      // console.log("Staker Manager Balance 6: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);
      expect(await stakingManagerContract.getAvailableAssets(alice.address)).to.equal(alicePending);
      expect(await stakingManagerContract.getAvailableAssets(bob.address)).to.equal(bobPending);
      expect(await stakingManagerContract.getAvailableAssets(carl.address)).to.equal(carlPending);
      // console.log("Alice deposit: %s pending: %s", aliceLessAssets, alicePending);
      // console.log("Bob   deposit: %s pending: %s", bobLessAssets, bobPending);
      // console.log("Carl  deposit: %s pending: %s", carlLessAssets, carlPending);
      // console.log("Aurora required  in Manager: %s", alicePending.add(bobPending).add(carlPending));
      // console.log("Aurora available in Manager: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));

      // The available tokens in the Manager should be enough to cover the pending orders.
      expect(alicePending.add(bobPending).add(carlPending)).to.equal(
        await auroraTokenContract.balanceOf(stakingManagerContract.address)
      );

      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(alicePending, alice.address, alice.address)
      // console.log("Alice withdraw: %s", alicePending);
      // console.log("Staker Manager Balance 7: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      await stakedAuroraVaultContract.connect(bob).withdraw(bobPending, bob.address, bob.address)
      // console.log("  Bob withdraw: %s", bobPending);
      // console.log("Staker Manager Balance 8: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      await stakedAuroraVaultContract.connect(carl).withdraw(carlPending, carl.address, carl.address)
      // console.log(" Carl withdraw: %s", carlPending);
      // console.log("Staker Manager Balance 9: %s", await auroraTokenContract.balanceOf(stakingManagerContract.address));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(aliceBalance.add(alicePending));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(bobBalance.add(bobPending));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(carlBalance.add(carlPending));
    });

    it("Should allow Alice redeem from Depositor 01.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice
      } = await loadFixture(depositPoolFixture);

      const preAliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const preAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const preAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      await stakedAuroraVaultContract.connect(alice).redeem(preAliceShares, alice.address, alice.address);
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      const alicePendingAssets = await stakingManagerContract.getPendingOrderAssets(alice.address);
      expect(alicePendingAssets).to.be.greaterThan(0);
      const posAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      expect(preAliceDep00).to.be.lessThan(posAliceDep00);
      expect(preAliceDep01).to.be.lessThan(posAliceDep01.add(alicePendingAssets));
      expect(alicePendingAssets).to.be.greaterThan(preAliceShares);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      const aliceAurora = await auroraTokenContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(alicePendingAssets, alice.address, alice.address)
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(aliceAurora.add(alicePendingAssets));
    });

    it("Should allow Bob to deplete Dep 01 and redeem from Dep 00.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(depositPoolFixture);

      // CONSIDER: at this point, the Depositor 01 will receive the first withdraw. But,
      // it does not have enough to pay back, so it will be depleted.
      // The rest of the funds to pay Carl will be taken from Depositor 00.
      // console.log("Depositor 00 shares: %s", await auroraStakingContract.getUserShares(depositor00Contract.address));
      // console.log("Depositor 01 shares: %s", await auroraStakingContract.getUserShares(depositor01Contract.address));
      // console.log("pre Bob shares: %s", await stakedAuroraVaultContract.balanceOf(bob.address));
      const preBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pre 00: %s", await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address));
      // console.log("pre 01: %s", preBobDep01);
      const bobShares = stakedAuroraVaultContract.balanceOf(bob.address);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.equal(0);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      expect(await stakingManagerContract.getPendingOrderAssets(bob.address)).to.be.greaterThan(0);
      const posBobDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posBobDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pos 00: %s", posBobDep00);
      // console.log("pos 01: %s", posBobDep01);

      // Depositor 01 must be depleted and Dep 00 should have enough to cover for Alice and Carl.
      expect(posBobDep01).to.equal(0);
      expect(posBobDep00).to.be.greaterThan(preBobDep01);

      // Next deposit should go to the Depositor 01.
      const carlDeposit = ethers.BigNumber.from(1_000).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

      const posCarlDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      expect(posCarlDep01).to.equal(carlDeposit);
      // console.log("pos 00: %s", await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address));
      // console.log("pos 01: %s", posCarlDep01);

      // Alice withdraw should deplete Depositor 01 again.
      const aliceShares = stakedAuroraVaultContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();
      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.be.greaterThan(0);
      const posAliceDep00 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor00Contract.address);
      const posAliceDep01 = await stakingManagerContract.getTotalAssetsFromDepositor(depositor01Contract.address);
      // console.log("pos 00: %s", posAliceDep00);
      // console.log("pos 01: %s", posAliceDep01);

      // Depositor 01 must be depleted and Dep 00 should have enough to cover for Carl.
      expect(posAliceDep01).to.equal(0);

      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      expect(carlShares).to.be.greaterThan(0);
      expect(posAliceDep00).to.be.equal(
        await stakedAuroraVaultContract.previewRedeem(carlShares)
      );

      const bobAurora = await auroraTokenContract.balanceOf(bob.address);
      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, bob.address, bob.address)
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(bobAurora.add(bobAvailableAssets));
    });

    it("Should allow redeem at different time periods. ⌚", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      const preAliceAssets = await auroraTokenContract.balanceOf(alice.address);
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const aliceRewards = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      const preBobAssets = await auroraTokenContract.balanceOf(bob.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const bobRewards = await stakedAuroraVaultContract.previewRedeem(bobShares);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // console.log("Bob withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("Bob pending  order: %s", await stakingManagerContract.getPendingOrderAssets(bob.address));
      // console.log("Bob available asse: %s", await stakingManagerContract.getAvailableAssets(bob.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending. Alice assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("Bob withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(bob.address));
      // console.log("Bob pending  order: %s", await stakingManagerContract.getPendingOrderAssets(bob.address));
      // console.log("Bob available asse: %s", await stakingManagerContract.getAvailableAssets(bob.address));
      // console.log("-----------------");

      const aliceAvailableAssets = await stakingManagerContract.getAvailableAssets(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets, alice.address, alice.address)
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(preAliceAssets.add(aliceAvailableAssets));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.be.greaterThan(preAliceAssets.add(aliceRewards));

      // console.log("Alice withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(alice.address));
      // console.log("Alice pending  order: %s", await stakingManagerContract.getPendingOrderAssets(alice.address));
      // console.log("Alice available asse: %s", await stakingManagerContract.getAvailableAssets(alice.address));
      // console.log("-----------------");

      const preCarlAssets = await auroraTokenContract.balanceOf(carl.address);
      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const carlRewards = await stakedAuroraVaultContract.previewRedeem(carlShares);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // console.log("Carl withdraw order: %s", await stakingManagerContract.getWithdrawOrderAssets(carl.address));
      // console.log("Carl pending  order: %s", await stakingManagerContract.getPendingOrderAssets(carl.address));
      // console.log("Carl available asse: %s", await stakingManagerContract.getAvailableAssets(carl.address));
      // console.log("-----------------");

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, bob.address, bob.address)
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(preBobAssets.add(bobAvailableAssets));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.be.greaterThan(preBobAssets.add(bobRewards));

      // Move forward: From withdraw to pending. Carl assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets.add(carlAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets.add(carlRewards));
    });

    it("Should allow to transfer withdraw to a different receiver. 🎁", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        bob,
        carl
      } = await loadFixture(depositPoolFixture);

      const preAliceAssets = await auroraTokenContract.balanceOf(alice.address);
      const aliceShares = await stakedAuroraVaultContract.balanceOf(alice.address);
      const aliceRewards = await stakedAuroraVaultContract.previewRedeem(aliceShares);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preBobAssets = await auroraTokenContract.balanceOf(bob.address);
      const bobShares = await stakedAuroraVaultContract.balanceOf(bob.address);
      const bobRewards = await stakedAuroraVaultContract.previewRedeem(bobShares);
      await stakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);

      // Move forward: From withdraw to pending. Alice assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets01 = await auroraTokenContract.balanceOf(carl.address);
      const aliceAvailableAssets = await stakingManagerContract.getAvailableAssets(alice.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets, carl.address, alice.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets01.add(aliceAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets01.add(aliceRewards));
      expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(preAliceAssets);

      const carlShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      const carlRewards = await stakedAuroraVaultContract.previewRedeem(carlShares);
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

      // Move forward: From withdraw to pending. Bob assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets02 = await auroraTokenContract.balanceOf(carl.address);
      const bobAvailableAssets = await stakingManagerContract.getAvailableAssets(bob.address);
      await stakedAuroraVaultContract.connect(bob).withdraw(bobAvailableAssets, carl.address, bob.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets02.add(bobAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets02.add(bobRewards));
      expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(preBobAssets);

      // Move forward: From withdraw to pending. Carl assets are available now!
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const preCarlAssets = await auroraTokenContract.balanceOf(carl.address);
      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address)
      expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(preCarlAssets.add(carlAvailableAssets));
      expect(await auroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(preCarlAssets.add(carlRewards));
    });

    it("Should not allow to withdraw more than available. ", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice
      } = await loadFixture(depositPoolFixture);

      const aliceShares = stakedAuroraVaultContract.balanceOf(alice.address);
      await stakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // The problem here is running the withdraw before the assets are available.
      const alicePendingAssets = await stakingManagerContract.getPendingOrderAssets(alice.address);
      await expect(
        stakedAuroraVaultContract.connect(alice).withdraw(alicePendingAssets, alice.address, alice.address)
      ).to.be.revertedWith("NOT_ENOUGH_AVAILABLE_ASSETS");

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // The problem here is running the withdraw with more assets than the available.
      const aliceAvailableAssets = (await stakingManagerContract.getAvailableAssets(alice.address));
      await expect(
        stakedAuroraVaultContract.connect(alice).withdraw(aliceAvailableAssets.add(1), alice.address, alice.address)
      ).to.be.revertedWith("NOT_ENOUGH_AVAILABLE_ASSETS");
    });
  });

  describe("Partially redeem and withdraw Aurora tokens", function () {
    it("Should allow redeem and withdraw assets from multiple users.", async function () {
      const {
        auroraTokenContract,
        stakedAuroraVaultContract,
        stakingManagerContract,
        carl,
        decimals
      } = await loadFixture(depositPoolFixture);

      const carlShares01 = await stakedAuroraVaultContract.balanceOf(carl.address);

      const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stakedAuroraVaultContract.address, carlDeposit);
      await stakedAuroraVaultContract.connect(carl).deposit(carlDeposit, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Partial withdraw.
      await stakedAuroraVaultContract.connect(carl).redeem(carlShares01, carl.address, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      // console.log("⚠ Available: > %s", carlAvailableAssets);
      const carlWithdraw01 = carlAvailableAssets.sub(ethers.BigNumber.from(10_000).mul(decimals));
      // console.log("1st half: -->> %s", carlWithdraw01);
      // console.log("2nd half: -->> %s", ethers.BigNumber.from(10_000).mul(decimals));
      // console.log("-----------------------------");
      // TOTAL WITHDRAW.
      // await stakedAuroraVaultContract.connect(carl).withdraw(carlAvailableAssets, carl.address, carl.address);

      // in 2 partial WITHDRAWs.
      await stakedAuroraVaultContract.connect(carl).withdraw(carlWithdraw01, carl.address, carl.address);

      // total redeem.
      const carlRemainingShares = await stakedAuroraVaultContract.balanceOf(carl.address);
      await stakedAuroraVaultContract.connect(carl).redeem(carlRemainingShares, carl.address, carl.address);

      // Move forward: From withdraw to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const testAvailableAssets01 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets01).to.be.greaterThan(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      // New + available assets should increase.
      const testAvailableAssets02 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets01).to.be.lessThan(testAvailableAssets02);

      await stakedAuroraVaultContract.connect(carl).withdraw(
        ethers.BigNumber.from(10_000).mul(decimals), carl.address, carl.address
      );

      const testAvailableAssets03 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets03).to.be.greaterThan(0);
      expect(testAvailableAssets03).to.be.lessThan(testAvailableAssets02);

      await stakedAuroraVaultContract.connect(carl).withdraw(
        await stakingManagerContract.getAvailableAssets(carl.address), carl.address, carl.address
      );

      const testAvailableAssets04 = await stakingManagerContract.getAvailableAssets(carl.address);
      expect(testAvailableAssets04).to.equal(0);
    });
  });

  describe("Give the allowance to a 3rd party 🦅 to withdraw/redeem", function () {
    it("Alice will redeem and withdraw Carl assets.", async function () {
      const {
        stakedAuroraVaultContract,
        stakingManagerContract,
        alice,
        carl,
        decimals
      } = await loadFixture(depositPoolFixture);

      // const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals); // Original deposit
      const carlAllowAllice = ethers.BigNumber.from(10_000).mul(decimals);

      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.equal(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      await stakedAuroraVaultContract.connect(carl).approve(alice.address, carlAllowAllice);

      await expect(
        stakedAuroraVaultContract.connect(alice).redeem(carlAllowAllice, alice.address, alice.address)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
      await stakedAuroraVaultContract.connect(alice).redeem(carlAllowAllice, alice.address, carl.address);

      // Move forward: From redeem to pending.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      expect(await stakingManagerContract.getPendingOrderAssets(alice.address)).to.be.greaterThan(0);
      expect(await stakingManagerContract.getPendingOrderAssets(carl.address)).to.equal(0);

      // Move forward: From pending to available.
      await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
      await stakingManagerContract.cleanOrdersQueue();

      const carlAvailableAssets = await stakingManagerContract.getAvailableAssets(carl.address);
      await stakedAuroraVaultContract.connect(alice).withdraw(carlAvailableAssets, carl.address, carl.address);
    });
  });
});