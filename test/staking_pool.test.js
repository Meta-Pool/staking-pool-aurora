// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage of Hardhat Network's snapshot functionality.
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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

    const stAuroraTokenContract = await StAuroraToken.deploy(
      auroraTokenContract.address,
      "Staked Aurora Token",
      "stAURORA"
    );
    await stAuroraTokenContract.deployed();

    const stakingManagerContract = await StakingManager.deploy(
      stAuroraTokenContract.address,
      auroraStakingContract.address,
      depositors_owner.address
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
    });

    it("Should assign the total supply of Aurora tokens to Alice, Bob and Carl", async function () {
      const { auroraTokenContract, alice, bob, carl } = await loadFixture(deployPoolFixture);
      const aliceBalance = await auroraTokenContract.balanceOf(alice.address);
      const bobBalance = await auroraTokenContract.balanceOf(bob.address);
      const carlBalance = await auroraTokenContract.balanceOf(carl.address);
      expect(await auroraTokenContract.totalSupply()).to.equal(aliceBalance.add(bobBalance).add(carlBalance));
    });
  });

  // describe("Staking Aurora tokens", function () {
  //   it("Should allow staking and have correct balances", async function () {
  //     const {
  //       poolContract,
  //       auroraTokenContract,
  //       alice,
  //       decimals
  //     } = await loadFixture(deployPoolFixture);

  //     const originalAuroraAmount = await auroraTokenContract.balanceOf(alice.address);
  //     const amountToStake = ethers.BigNumber.from(10).mul(decimals);
  //     await auroraTokenContract.connect(alice).approve(poolContract.address, amountToStake);
  //     await poolContract.connect(alice).depositAndStake(amountToStake);

  //     expect(await poolContract.balanceOf(alice.address)).to.equal(
  //       await poolContract.convertToShares(amountToStake)
  //     );

  //     expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(
  //       ethers.BigNumber.from(originalAuroraAmount).sub(amountToStake)
  //     );
  //   });

  //   it("Should not allow less than min deposit amount", async function () {
  //     const {
  //         poolContract,
  //         auroraTokenContract,
  //         alice,
  //         decimals
  //     } = await loadFixture(deployPoolFixture);

  //     const amountToStake = ethers.BigNumber.from(6).mul(decimals);
  //     await auroraTokenContract.connect(alice).approve(poolContract.address, amountToStake);

  //     await expect(
  //       poolContract.connect(alice).depositAndStake(amountToStake)
  //     ).to.be.revertedWith("LESS_THAN_MIN_DEPOSIT_AMOUNT");
  //   });
  // });

//   describe("Transactions", function () {
//     it("Should transfer tokens between accounts", async function () {
//       const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
//         deployPoolFixture
//       );

//       // console.log('owner balance: %s', await hardhatToken.balanceOf(owner.address));
//       // console.log('addr1 balance: %s', await hardhatToken.balanceOf(addr1.address));
//       // console.log('addr2 balance: %s', await hardhatToken.balanceOf(addr2.address));

//       // Transfer 50 tokens from owner to addr1
//       await expect(
//         hardhatToken.transfer(addr1.address, 50)
//       ).to.changeTokenBalances(hardhatToken, [owner, addr1], [-50, 50]);

//       // Transfer 50 tokens from addr1 to addr2
//       // We use .connect(signer) to send a transaction from another account
//       await expect(
//         hardhatToken.connect(addr1).transfer(addr2.address, 50)
//       ).to.changeTokenBalances(hardhatToken, [addr1, addr2], [-50, 50]);
//     });

//     it("should emit Transfer events", async function () {
//       const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
//         deployPoolFixture
//       );

//       // Transfer 50 tokens from owner to addr1
//       await expect(hardhatToken.transfer(addr1.address, 50))
//         .to.emit(hardhatToken, "Transfer")
//         .withArgs(owner.address, addr1.address, 50);

//       // Transfer 50 tokens from addr1 to addr2
//       // We use .connect(signer) to send a transaction from another account
//       await expect(hardhatToken.connect(addr1).transfer(addr2.address, 50))
//         .to.emit(hardhatToken, "Transfer")
//         .withArgs(addr1.address, addr2.address, 50);
//     });

//     it("Should fail if sender doesn't have enough tokens", async function () {
//       const { hardhatToken, owner, addr1 } = await loadFixture(
//         deployPoolFixture
//       );
//       const initialOwnerBalance = await hardhatToken.balanceOf(owner.address);

//       // Try to send 1 token from addr1 (0 tokens) to owner.
//       // `require` will evaluate false and revert the transaction.
//       await expect(
//         hardhatToken.connect(addr1).transfer(owner.address, 1)
//       ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

//       // Owner balance shouldn't have changed.
//       expect(await hardhatToken.balanceOf(owner.address)).to.equal(
//         initialOwnerBalance
//       );
//     });
//   });
});