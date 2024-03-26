import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Token", function () {
  async function deployTokenFixture() {
    const [owner, otherAccount, otherAccount2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    const tokenContract = await Token.deploy(owner.address);
    return { tokenContract, owner, otherAccount, otherAccount2 };
  }

  describe("setBuyFeePercentage", function () {
    it("Should allow owner to set buy fee percentage within valid range", async function () {

      const { tokenContract, owner } = await loadFixture(deployTokenFixture);

      expect(await tokenContract.connect(owner).setBuyFeePercentage(5)).to.not.be.reverted;
      expect(await tokenContract.fee()).to.equal(5);
    });

    it("Should revert when non-owner tries to set buy fee percentage", async function () {
      const { tokenContract, otherAccount } = await loadFixture(deployTokenFixture);

      expect(tokenContract.connect(otherAccount).setBuyFeePercentage(5)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when setting buy fee percentage outside valid range", async function () {
      const { tokenContract, owner } = await loadFixture(deployTokenFixture);

      expect(tokenContract.connect(owner).setBuyFeePercentage(11)).to.be.revertedWith("Sho?");
    });
  });

  describe("Buy and Sell", function () {
    // it("Should allow buying tokens with correct amount", async function () {
    //   // const { tokenContract, owner, otherAccount, otherAccount2 } = await loadFixture(deployTokenFixture);

    //   // // const initialBalance = await tokenContract.balanceOf(otherAccount.address);

    //   // expect(() => tokenContract.connect(otherAccount)._buy()).to.changeTokenBalance(tokenContract, otherAccount, 100); // Assuming tokenPrice is 100
    //   // expect(await tokenContract.feeBalance()).to.be.equal(1); // Assuming fee is 1%
    // });

    it("Should allow selling tokens with correct amount", async function () {
      const { tokenContract, otherAccount } = await loadFixture(deployTokenFixture);
      await tokenContract._mint(otherAccount, 100);
      expect((await tokenContract.connect(otherAccount)._sell(100))).to.emit(tokenContract, "TokensSwapped") // tokenPrice is 100

      expect(await tokenContract.feeBalance()).to.be.equal(1); // fee is 1%
      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(0);
    });

  });

  describe("MyERC", function () {
    async function deployERC20Fixture() {
      const [owner, otherAccount, otherAccount2] = await ethers.getSigners();
      const ERC20 = await ethers.getContractFactory("Token");
      const erc20Contract = await ERC20.deploy(owner.address);
      await erc20Contract._mint(owner, 100);
      return { erc20Contract, owner, otherAccount, otherAccount2 };
    }
  
    describe("transfer", function () {
      it("Should allow transferring tokens with correct amount", async function () {
        const { erc20Contract, otherAccount } = await loadFixture(deployERC20Fixture);

        await erc20Contract.transfer(otherAccount.address, 100);
  
        expect(await erc20Contract.balanceOf(otherAccount.address)).to.equal(100);
      });
  
      it("Should revert when transferring tokens with insufficient balance", async function () {
        const { erc20Contract, otherAccount } = await loadFixture(deployERC20Fixture);
        
        await expect(await erc20Contract.transfer(otherAccount.address, 100)).to.be.not.reverted.then(() => 
          expect(erc20Contract.transfer(otherAccount.address, 100)).to.be.revertedWithCustomError(erc20Contract, "ERC20InsufficientBalance")
        );
      });
    });
  
    describe("approve and transferFrom", function () {
      it("Should allow approving and transferring tokens with correct amount", async function () {
        const { erc20Contract, owner, otherAccount } = await loadFixture(deployERC20Fixture);
        await erc20Contract.approve(otherAccount.address, 100);
        await erc20Contract.connect(otherAccount).transferFrom(owner.address, otherAccount.address, 100);
  
        expect(await erc20Contract.balanceOf(otherAccount.address)).to.equal(100);
      });
  
      it("Should revert when transferring tokens with insufficient allowance", async function () {
        const { erc20Contract, owner, otherAccount } = await loadFixture(deployERC20Fixture);
        expect(erc20Contract.connect(otherAccount).transferFrom(owner.address, otherAccount.address, 100)).to.be.revertedWithCustomError(erc20Contract, "ERC20InsufficientAllowance");
      });
    });
  });
  
});
