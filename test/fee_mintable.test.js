const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  botsHordeFixture,
  TOTAL_SPAMBOTS,
} = require("./test_setup");

describe("Testing the Staking Manager functionality for minting fee 🪙.", function () {
  it("Should mint ONLY for Treasury ROLE.", async function () {
    const {
      stakingManagerContract,
      treasury
    } = await loadFixture(botsHordeFixture);

    await expect(
      stakingManagerContract.mintFee()
    ).to.be.revertedWith("AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9");
    await time.increase(await stakingManagerContract.coolingTimeSeconds());
    await stakingManagerContract.connect(treasury).mintFee();
  });

  it("Should mint ONLY after cooling period.", async function () {
    const {
      stakingManagerContract,
      treasury
    } = await loadFixture(botsHordeFixture);

    // await time.increase(await stakingManagerContract.coolingTimeSeconds());
    await expect(
      stakingManagerContract.connect(treasury).mintFee()
    ).to.be.revertedWithCustomError(stakingManagerContract, "FeeMintNotAvailable");
  });

  it("Should mint ONLY after cooling period.", async function () {
    const {
      auroraTokenContract,
      StakedAuroraVaultContract,
      stakingManagerContract,
      alice,
      bob,
      carl,
      spambots
    } = await loadFixture(botsHordeFixture);

    // For courtesy, this expect is ignored.
    // expect(TOTAL_SPAMBOTS).to.be.equal(200);

    // WITH it.
    // Correct gas consumption and the Max Capacity hardcoded in the contract.
    // GAS used on clean-orders:  BigNumber { value: "9209204" }
    // GAS used on clean-orders:  BigNumber { value: "2747768" }
    // GAS used on clean-orders:  BigNumber { value: "142252" }
    // WITHOUT the depositor length requirement.
    // Correct gas consumption and the Max Capacity hardcoded in the contract.
    // GAS used on clean-orders:  BigNumber { value: "9209038" }
    // GAS used on clean-orders:  BigNumber { value: "2747635" }
    // GAS used on clean-orders:  BigNumber { value: "142120" }
    const VERBOSE = false;

    const aliceShares = await StakedAuroraVaultContract.balanceOf(alice.address);
    const bobShares = await StakedAuroraVaultContract.balanceOf(bob.address);
    const carlShares = await StakedAuroraVaultContract.balanceOf(carl.address);

    console.log(aliceShares);
    console.log(bobShares);
    console.log(carlShares);

    console.log("FEE MINT: ", );

    const initialMintFee = await stakingManagerContract.getAvailableMintFee();
    const totalSupply = await StakedAuroraVaultContract.totalSupply();

    // await stakingManagerContract.mintFee();

    // expect(await StakedAuroraVaultContract.totalSupply()).to.be.greaterThan(totalSupply.add(initialMintFee));



    // // Redeem ALL bots balances.
    // for (let i = 0; i < TOTAL_SPAMBOTS; i++) {
    //   var shares = await StakedAuroraVaultContract.balanceOf(spambots[i].address);
    //   await StakedAuroraVaultContract.connect(spambots[i]).redeem(
    //     shares, spambots[i].address, spambots[i].address
    //   );
    // }

    // await expect(
    //   StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address)
    // ).to.be.revertedWithCustomError(stakingManagerContract, "MaxOrdersExceeded");

    // // Move forward: From withdraw to pending.
    // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
    // var tx = await stakingManagerContract.cleanOrdersQueue();
    // var gasUsed = (await tx.wait()).gasUsed;
    // if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

    // await StakedAuroraVaultContract.connect(alice).redeem(aliceShares, alice.address, alice.address);
    // await StakedAuroraVaultContract.connect(bob).redeem(bobShares, bob.address, bob.address);
    // await StakedAuroraVaultContract.connect(carl).redeem(carlShares, carl.address, carl.address);

    // // Move forward: From pending to available.
    // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
    // var tx = await stakingManagerContract.cleanOrdersQueue();
    // var gasUsed = (await tx.wait()).gasUsed;
    // if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

    // // After the redeem, let's pull the funds out with a withdraw.
    // const nextSpamBalance = (await auroraTokenContract.balanceOf(spambots[0].address)).add(
    //   await stakingManagerContract.getAvailableAssets(spambots[0].address)
    // );
    // await StakedAuroraVaultContract.connect(spambots[0]).completeDelayUnstake(
    //   await stakingManagerContract.getAvailableAssets(spambots[0].address),
    //   spambots[0].address
    // );
    // expect(await auroraTokenContract.balanceOf(spambots[0].address)).to.equal(nextSpamBalance);

    // // Move forward: From pending to available.
    // await time.increaseTo(await stakingManagerContract.nextCleanOrderQueue());
    // var tx = await stakingManagerContract.cleanOrdersQueue();
    // var gasUsed = (await tx.wait()).gasUsed;
    // if (VERBOSE) { console.log("GAS used on clean-orders: ", gasUsed); }

    // const nextAliceBalance = (await auroraTokenContract.balanceOf(alice.address)).add(
    //   await stakingManagerContract.getAvailableAssets(alice.address)
    // );
    // await StakedAuroraVaultContract.connect(alice).completeDelayUnstake(
    //   await stakingManagerContract.getAvailableAssets(alice.address),
    //   alice.address
    // );
    // expect(await auroraTokenContract.balanceOf(alice.address)).to.equal(nextAliceBalance);

    // const nextBobBalance = (await auroraTokenContract.balanceOf(bob.address)).add(
    //   await stakingManagerContract.getAvailableAssets(bob.address)
    // );
    // await StakedAuroraVaultContract.connect(bob).completeDelayUnstake(
    //   await stakingManagerContract.getAvailableAssets(bob.address),
    //   bob.address
    // );
    // expect(await auroraTokenContract.balanceOf(bob.address)).to.equal(nextBobBalance);

    // const nextCarlBalance = (await auroraTokenContract.balanceOf(carl.address)).add(
    //   await stakingManagerContract.getAvailableAssets(carl.address)
    // );
    // await StakedAuroraVaultContract.connect(carl).completeDelayUnstake(
    //   await stakingManagerContract.getAvailableAssets(carl.address),
    //   carl.address
    // );
    // expect(await auroraTokenContract.balanceOf(carl.address)).to.equal(nextCarlBalance);
  });
});
