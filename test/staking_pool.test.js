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
    const Pool = await ethers.getContractFactory("StakingPoolAurora");
    const [owner, treasury, operator, aurora_token, addr1, addr2] = await ethers.getSigners();

    console.log("0 HERE");

    // To deploy our contract, we just have to call Token.deploy() and await
    // its deployed() method, which happens once its transaction has been
    // mined.
    const hardhatPool = await Pool.deploy(owner.address, treasury.address, operator.address, aurora_token.address);
    // const hardhatPool = await Pool.deploy("staked aurora", "stAURORA", owner, addr1);

    console.log("1 HERE");

    await hardhatPool.deployed();


    console.log("2 HERE");

    // SIMULATE STAKING TODO:
    // await hardhatToken.mintAfterStake(owner.address, 10_000_000 * (10 ** 18));
    await hardhatPool.mintAfterStake(owner.address, 1_000_000);

    console.log("3 HERE");

    // Fixtures can return anything you consider useful for your tests
    return { Pool, hardhatPool, owner, addr1, addr2 };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define each
    // of your tests. It receives the test name, and a callback function.
    //
    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      console.log("0 META");
      const { hardhatPool, owner } = await loadFixture(deployPoolFixture);

      console.log("TOKEN OWNER: %s", await hardhatPool.owner());
      console.log("TOKEN OWNER: %s", await hardhatPool.owner_account_id());

      // `expect` receives a value and wraps it in an assertion object. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the contract to be
      // equal to our Signer's owner.
      expect(await hardhatPool.owner()).to.equal(owner.address);
    //   expect(await hardhatPool.owner()).to.equal(owner.address);
    });

    // it("Should assign the total supply of tokens to the owner", async function () {
    //   const { hardhatToken, owner } = await loadFixture(deployPoolFixture);
    //   const ownerBalance = await hardhatToken.balanceOf(owner.address);
    //   expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
    // });
  });

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