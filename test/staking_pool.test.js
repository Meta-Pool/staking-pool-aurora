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
    const StAuroraToken = await ethers.getContractFactory("StAuroraToken");
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
    const initialSupply = ethers.BigNumber.from(9_000_000).mul(decimals);
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

    const minDepositAmount = ethers.BigNumber.from(1).mul(decimals);
    const stAuroraTokenContract = await StAuroraToken.deploy(
      auroraTokenContract.address,
      "Staked Aurora Token",
      "stAURORA",
      minDepositAmount
    );
    await stAuroraTokenContract.deployed();

    const stakingManagerContract = await StakingManager.deploy(
      stAuroraTokenContract.address,
      auroraStakingContract.address,
      depositors_owner.address,
      10
    );
    await stakingManagerContract.deployed();

    // Insert/update the staking manager in the ERC-4626
    await stAuroraTokenContract.updataStakingManager(stakingManagerContract.address);

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
    stakingManagerContract.connect(owner);

    // Fixtures can return anything you consider useful for your tests
    return {
      auroraTokenContract,
      auroraStakingContract,
      stAuroraTokenContract,
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
      stAuroraTokenContract,
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

    const aliceDeposit = ethers.BigNumber.from(100_000).mul(decimals);
    await auroraTokenContract.connect(alice).approve(stAuroraTokenContract.address, aliceDeposit);
    await stAuroraTokenContract.connect(alice).deposit(aliceDeposit, alice.address);

    const bobDeposit = ethers.BigNumber.from(6_000).mul(decimals);
    await auroraTokenContract.connect(bob).approve(stAuroraTokenContract.address, bobDeposit);
    await stAuroraTokenContract.connect(bob).deposit(bobDeposit, bob.address);

    const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
    await auroraTokenContract.connect(carl).approve(stAuroraTokenContract.address, carlDeposit);
    await stAuroraTokenContract.connect(carl).deposit(carlDeposit, carl.address);

    return {
      auroraTokenContract,
      auroraStakingContract,
      stAuroraTokenContract,
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
        stAuroraTokenContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        owner,
        depositors_owner
      } = await loadFixture(deployPoolFixture);

      expect(await stAuroraTokenContract.owner()).to.equal(owner.address);
      expect(await stAuroraTokenContract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await stAuroraTokenContract.asset()).to.equal(auroraTokenContract.address);
      expect(await stAuroraTokenContract.totalAssets()).to.equal(0);

      expect(await stakingManagerContract.isAdmin(owner.address)).to.be.true;
      expect(await stakingManagerContract.isDepositorsOwner(depositors_owner.address)).to.be.true;
      expect(await stakingManagerContract.stAurora()).to.equal(stAuroraTokenContract.address);
      expect(await stakingManagerContract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await stakingManagerContract.auroraStaking()).to.equal(auroraStakingContract.address);
      expect(await stakingManagerContract.depositorsLength()).to.equal(2);
      expect(await stakingManagerContract.totalAssets()).to.equal(0);

      expect(await depositor00Contract.owner()).to.equal(depositors_owner.address);
      expect(await depositor00Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor00Contract.stAurora()).to.equal(stAuroraTokenContract.address);
      expect(await depositor00Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor00Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await depositor01Contract.owner()).to.equal(depositors_owner.address);
      expect(await depositor01Contract.stakingManager()).to.equal(stakingManagerContract.address);
      expect(await depositor01Contract.stAurora()).to.equal(stAuroraTokenContract.address);
      expect(await depositor01Contract.auroraToken()).to.equal(auroraTokenContract.address);
      expect(await depositor01Contract.auroraStaking()).to.equal(auroraStakingContract.address);

      expect(await auroraTokenContract.decimals()).to.equal(
        await stAuroraTokenContract.decimals());
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob and Carl.", async function () {
      const { auroraTokenContract, alice, bob, carl } = await loadFixture(deployPoolFixture);
      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      expect(await auroraTokenContract.totalSupply()).to.equal(aliceBalance.add(bobBalance).add(carlBalance));
    });
  });

  describe("Staking Aurora tokens", function () {
    it("Should allow deposits from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stAuroraTokenContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(deployPoolFixture);

      const aliceDeposit = ethers.BigNumber.from(100_000).mul(decimals);
      await auroraTokenContract.connect(alice).approve(stAuroraTokenContract.address, aliceDeposit);
      await stAuroraTokenContract.connect(alice).deposit(aliceDeposit, alice.address);
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.equal(
        await stAuroraTokenContract.previewDeposit(aliceDeposit)
      );
      // First deposit is equal to the deposited asset.
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.equal(aliceDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const bobDeposit = ethers.BigNumber.from(6_000).mul(decimals);
      await auroraTokenContract.connect(bob).approve(stAuroraTokenContract.address, bobDeposit);
      await stAuroraTokenContract.connect(bob).deposit(bobDeposit, bob.address);
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.equal(
        await stAuroraTokenContract.previewDeposit(bobDeposit)
      );
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.be.lessThan(bobDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const carlDeposit = ethers.BigNumber.from(24_000).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stAuroraTokenContract.address, carlDeposit);
      await stAuroraTokenContract.connect(carl).deposit(carlDeposit, carl.address);
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.equal(
        await stAuroraTokenContract.previewDeposit(carlDeposit)
      );
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.be.lessThan(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
    });

    it("Should allow minting from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stAuroraTokenContract,
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
      await auroraTokenContract.connect(alice).approve(stAuroraTokenContract.address,
        await stAuroraTokenContract.previewMint(aliceMint.add(extraToken)));
      await stAuroraTokenContract.connect(alice).mint(aliceMint, alice.address);
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.equal(aliceMint);
      // First deposit is equal to the deposited asset.
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.equal(aliceMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const bobMint = ethers.BigNumber.from(4).mul(decimals);
      await auroraTokenContract.connect(bob).approve(stAuroraTokenContract.address,
        await stAuroraTokenContract.previewMint(bobMint.add(extraToken)));
      await stAuroraTokenContract.connect(bob).mint(bobMint, bob.address);
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.equal(bobMint);
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.be.equal(bobMint);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );

      const carlDeposit = ethers.BigNumber.from(60).mul(decimals);
      await auroraTokenContract.connect(carl).approve(stAuroraTokenContract.address,
        await stAuroraTokenContract.previewMint(carlDeposit.add(extraToken)));
      await stAuroraTokenContract.connect(carl).mint(carlDeposit, carl.address);
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.equal(carlDeposit);
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.be.equal(carlDeposit);
      expect(await stakingManagerContract.getDepositorShares(depositor00Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor00Contract.address)
      );
      expect(await stakingManagerContract.getDepositorShares(depositor01Contract.address)).to.equal(
        await auroraStakingContract.getUserShares(depositor01Contract.address)
      );
    });

    it("Should not allow less than min deposit amount", async function () {
      const {
          stAuroraTokenContract,
          auroraTokenContract,
          alice,
          decimals
      } = await loadFixture(deployPoolFixture);

      const amountToDeposit = ethers.BigNumber.from(1).mul(decimals).sub(1);
      await auroraTokenContract.connect(alice).approve(stAuroraTokenContract.address, amountToDeposit);

      // First, by direct deposit.
      await expect(
        stAuroraTokenContract.connect(alice).deposit(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");

      // Then, by minting shares.
      await expect(
        stAuroraTokenContract.connect(alice).mint(amountToDeposit, alice.address)
      ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");
    });
  });

  describe("Unstake and Withdraw Aurora tokens", function () {
    it("Should allow TOTAL unstake and withdraw assets from multiple users.", async function () {
      const {
        auroraTokenContract,
        auroraStakingContract,
        stAuroraTokenContract,
        stakingManagerContract,
        depositor00Contract,
        depositor01Contract,
        alice,
        bob,
        carl,
        decimals
      } = await loadFixture(depositPoolFixture);

      const aliceShares = await stAuroraTokenContract.balanceOf(alice.address);
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.be.greaterThan(0);
      const aliceLessAssets = await stAuroraTokenContract.previewRedeem(aliceShares);
      await stakingManagerContract.connect(alice).unstakeAll(alice.address);
      expect(await stAuroraTokenContract.balanceOf(alice.address)).to.equal(0);
      // CONSIDER: Alice assets in the withdraw-order are greater than last call
      // due to the fast (every second) price increase.
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(alice.address)
      ).to.be.greaterThanOrEqual(aliceLessAssets);

      const bobShares = await stAuroraTokenContract.balanceOf(bob.address);
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.be.greaterThan(0);
      const bobLessAssets = await stAuroraTokenContract.previewRedeem(bobShares);
      await stakingManagerContract.connect(bob).unstakeAll(bob.address);
      expect(await stAuroraTokenContract.balanceOf(bob.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(bob.address)
      ).to.be.greaterThanOrEqual(bobLessAssets);

      const carlShares = await stAuroraTokenContract.balanceOf(carl.address);
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.be.greaterThan(0);
      const carlLessAssets = await stAuroraTokenContract.previewRedeem(carlShares);
      await stakingManagerContract.connect(carl).unstakeAll(carl.address);
      expect(await stAuroraTokenContract.balanceOf(carl.address)).to.equal(0);
      expect(
        await stakingManagerContract.getWithdrawOrderAssets(carl.address)
      ).to.be.greaterThanOrEqual(carlLessAssets);

      // expect(await stakingManagerContract.totalAssets()).to.equal(0);
      expect(await stakingManagerContract.getTotalWithdrawInQueue()).to.equal(
        (await stakingManagerContract.getWithdrawOrderAssets(alice.address)).add(
          await stakingManagerContract.getWithdrawOrderAssets(bob.address)
        ).add(
          await stakingManagerContract.getWithdrawOrderAssets(carl.address)
        )
      );
    });
  });
});