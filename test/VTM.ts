import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
// import { VoteMaxToken } from "../typechain-types";

describe("VoteMaxToken", function () {
  // Fixture to deploy the contract with initial conditions
  async function deployVoteMaxTokenFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, otherAccount2] = await hre.ethers.getSigners();

    const voteMaxToken = await hre.ethers.deployContract("VoteMaxToken");
    return { voteMaxToken, owner, otherAccount, otherAccount2 };
  }

  // describe("Deployment", function () {
  //   it("Should deploy the contract with default values", async function () {
  //     const { voteMaxToken } = await loadFixture(deployVoteMaxTokenFixture);

  //     // Perform assertions on initial contract state
  //     expect(await voteMaxToken.timeToVote()).to.equal(259200); // 3 days in seconds
  //     expect(await voteMaxToken.tokenPrice()).to.equal(100);
  //     expect(await voteMaxToken.isVotingGoing()).to.equal(false);
  //   });
  // });

    describe("StartVoting", function () {
      it("Should start voting with correct parameters and emit event", async function () {
        const { voteMaxToken, otherAccount } = await loadFixture(deployVoteMaxTokenFixture);

        await voteMaxToken._mint(otherAccount.address, 1000);
  
        await expect(voteMaxToken.connect(otherAccount).startVoting(200))
            .to.emit(voteMaxToken, "VotingStarted")
            .withArgs(otherAccount.address, 200, 1000)
        
        await expect(await voteMaxToken.isVotingGoing()).to.be.equal(true);
        await expect(await voteMaxToken.highestVotedPriceNow()).to.be.equal(200);
      });
      it("Should restrict from double vote or another vote starting", async function () {
        const { voteMaxToken, otherAccount } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 1000);
  
        await expect(voteMaxToken.connect(otherAccount).startVoting(200))
            .to.emit(voteMaxToken, "VotingStarted")
            .withArgs(otherAccount.address, 200, 1000)

        await expect(voteMaxToken.connect(otherAccount).vote(200)).to.be.revertedWith("You are participating in vote!")
        await expect(voteMaxToken.connect(otherAccount).startVoting(201)).to.be.revertedWith("You are participating in vote!")        
      });
      it("Should change higest price when another guy votes", async function () {
        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 1000);
        await voteMaxToken._mint(otherAccount2.address, 2000);
  
        await expect(voteMaxToken.connect(otherAccount).startVoting(200))
            .to.emit(voteMaxToken, "VotingStarted")
            .withArgs(otherAccount.address, 200, 1000)

        await expect(await voteMaxToken.highestVotedPriceNow()).to.be.equal(200)

        await expect(voteMaxToken.connect(otherAccount2).startVoting(201))
            .to.emit(voteMaxToken, "VotingStarted")
            .withArgs(otherAccount2.address, 201, 2000)

        await expect(await voteMaxToken.highestVotedPriceNow()).to.be.equal(201)
      });
      it("Should fail when there is already an option", async function () {
        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 1000);
        await voteMaxToken._mint(otherAccount2.address, 1000);
  
        voteMaxToken.connect(otherAccount).startVoting(200)
        expect(voteMaxToken.connect(otherAccount2).startVoting(200)).to.be.rejectedWith("Such option already exist!")

      });
    });
  
    describe("Voting", function () {
      it("Should pass vote transaction if user has at least 0.05% token supply", async function () {
        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 5000);
        await voteMaxToken._mint(otherAccount2.address, 5000);
        await voteMaxToken.connect(otherAccount).startVoting(200);
  
        await expect(voteMaxToken.connect(otherAccount2).vote(200))
              .to.emit(voteMaxToken, "Voted")
      });
  
      it("Should fail vote transaction if user has less than 0.05% token supply", async function () {
        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 50000000);
        await voteMaxToken._mint(otherAccount2.address, 1);
        
        await voteMaxToken.connect(otherAccount).startVoting(200);

        await expect(voteMaxToken.connect(otherAccount2).vote(200)).to.be.revertedWith("You are not 0.05% holder!");
  
      });
      it("Should fail on double vote", async function () {

        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(otherAccount.address, 50);
        await voteMaxToken._mint(otherAccount2.address, 50);
        await voteMaxToken.connect(otherAccount).startVoting(200);
  
        await expect(await voteMaxToken.connect(otherAccount2).vote(200)).to.not.be.reverted.then(() =>
           expect(voteMaxToken.connect(otherAccount2).vote(200)).to.be.revertedWith("You are participating in vote!")
        );
        // await expect(await voteMaxToken.connect(otherAccount2).vote(200)).to.not.be.reverted
        // await expect(await voteMaxToken.connect(otherAccount2).vote(200)).to.be.revertedWith("You are participating in vote!")
      });
      it("Should fail when no such option", async function () {
        const { voteMaxToken, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
    
        await voteMaxToken._mint(otherAccount.address, 50);
        await voteMaxToken._mint(otherAccount2.address, 50);
        await voteMaxToken.connect(otherAccount).startVoting(200);
    
        await expect(voteMaxToken.connect(otherAccount2).vote(201))
        .to.be.revertedWith("No such vote option!")
      });
    });

    describe("Vote end", function() {
      it("Should end vote", async function () {
        const { voteMaxToken, owner } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(owner.address, 1000);

        await voteMaxToken.startVoting(200)

        await time.increase(60 * 60 * 24 * 3)

        expect(await voteMaxToken.endVote()).to.be.not.reverted;
        expect(await voteMaxToken.tokenPrice()).to.be.equal(200)
        expect(await voteMaxToken.isVotingGoing()).to.be.equal(false)
        expect(await voteMaxToken.highestVotedPriceNow()).to.be.equal(0)
        expect(await voteMaxToken.currentVoteCount()).to.be.equal(2)
        expect(await voteMaxToken.endDate()).to.be.equal(0)
      })

      it("Should not end vote", async function () {
        const { voteMaxToken, owner } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(owner.address, 1000);

        await voteMaxToken.startVoting(200);

        expect(voteMaxToken.endVote()).to.be.revertedWith("Time to vote has not ended!")
      })
    });

    describe("Token transfers", function () {
      it("Should prevent users from double-spending tokens on voting", async function () {
        const { voteMaxToken, owner, otherAccount, otherAccount2 } = await loadFixture(deployVoteMaxTokenFixture);
  
        await voteMaxToken._mint(owner.address, 1000);
        // Mock user A and B balances
        await voteMaxToken._mint(otherAccount.address, 1000);
        await voteMaxToken._mint(otherAccount2.address, 1000);
  
        // Start voting
        // await voteMaxToken.startVoting(200);
        await voteMaxToken.startVoting(200);
  
        // User A votes
        await voteMaxToken.connect(otherAccount).vote(200);
  
        // Transfer tokens from A to B
        expect(voteMaxToken.connect(otherAccount).transfer(otherAccount2.address, 500)).to.be.revertedWith("You already participating in vote!");
      });
    });

    describe("Functionaly", function () {
      it("Should change time to vote", async function () {
        const { voteMaxToken } = await loadFixture(deployVoteMaxTokenFixture);

        await voteMaxToken.setTimeToVote(100);
  
        expect(await voteMaxToken.timeToVote()).to.be.equal(100);
      });
      it("Should return time left", async function () {
        const { voteMaxToken } = await loadFixture(deployVoteMaxTokenFixture);

        await voteMaxToken.startVoting(200);
    
        const currentTimestamp = await time.latest()
    
        const timeLeftFromContract = await voteMaxToken.getTimeLeft();
    
        const expectedTimeLeft = await voteMaxToken.endDate() - BigInt(currentTimestamp);
    
        expect(timeLeftFromContract).to.equal(expectedTimeLeft, "Time left does not match expected value");
      });
    
      it("Should set token price", async function () {
        const { voteMaxToken } = await loadFixture(deployVoteMaxTokenFixture);

        await voteMaxToken.setTokenPrice(123321);

        expect(await voteMaxToken.tokenPrice()).to.be.equal(123321);
      });

      it("Should work with decimals price", async function () {
        const { voteMaxToken, otherAccount, owner } = await loadFixture(deployVoteMaxTokenFixture);
  
        await owner.sendTransaction({
          to: otherAccount.address,
          value: 100000000,
        });
        await voteMaxToken.setTokenPrice(15) // 1 wei to 1.5 

        expect((await voteMaxToken.connect(otherAccount)._buy({value: 100}))).to.emit(voteMaxToken, "TokensSwapped") // tokenPrice is 100
  
        expect(await voteMaxToken.balanceOf(otherAccount.address)).to.be.equal(66);
        expect(await voteMaxToken.totalSupply()).to.be.equal(66);
        
        await expect((await voteMaxToken.connect(otherAccount)._sell(66))).to.emit(voteMaxToken, "TokensSwapped") // tokenPrice is 100
  
        expect(await voteMaxToken.balanceOf(otherAccount.address)).to.be.equal(0);
        expect(await voteMaxToken.totalSupply()).to.be.equal(0);
      });
    });

})