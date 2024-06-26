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

      expect(tokenContract.connect(owner).setBuyFeePercentage(11)).to.be.revertedWith("Fee is not in valid range?");
    });
  });
  describe("Mint/Burn", function () {
    it("Should mint correctly", async function () {
      const { tokenContract, otherAccount } = await loadFixture(deployTokenFixture);

      await tokenContract._mint(otherAccount.address, 100)

      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(100);
    });
    it("Should burn correctly", async function () {
      const { tokenContract, otherAccount } = await loadFixture(deployTokenFixture);

      await tokenContract._mint(otherAccount.address, 100)
      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(100);
      
      await tokenContract._burn(otherAccount.address, 100)
      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(0);
    });
  })
  describe("Buy and Sell", function () {
    it("Should allow buying tokens with correct amount and correct total supply", async function () {
      const { tokenContract, otherAccount, owner } = await loadFixture(deployTokenFixture);

      await owner.sendTransaction({
        to: otherAccount.address,
        value: 100000000,
      });

      expect((await tokenContract.connect(otherAccount)._buy({value: 100}))).to.emit(tokenContract, "TokensSwapped") // tokenPrice is 100

      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(10);
      expect(await tokenContract.totalSupply()).to.be.equal(10);
    });
    it("Should allow selling tokens with correct amount and correct total supply", async function () {
      const { tokenContract, otherAccount, owner } = await loadFixture(deployTokenFixture);
      await tokenContract._mint(otherAccount, 100);

      await owner.sendTransaction({
        to: await tokenContract.getAddress(),
        value: 100000000,
      });

      expect((await tokenContract.connect(otherAccount)._sell(100))).to.emit(tokenContract, "TokensSwapped") // tokenPrice is 100

      expect(await tokenContract.feeBalance()).to.be.equal(1); // fee is 1%
      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(0);
      expect(await tokenContract.totalSupply()).to.be.equal(1);
    });
    it("Should colect and burn fee correctly", async function () {
      const { tokenContract, otherAccount, owner } = await loadFixture(deployTokenFixture);

      await owner.sendTransaction({
        to: otherAccount.address,
        value: 100000000,
      });

      expect((await tokenContract.connect(otherAccount)._buy({value: 10000}))).to.emit(tokenContract, "TokensSwapped") // tokenPrice is 100

      expect(await tokenContract.decimals()).to.be.equal(10);
      expect(await tokenContract.balanceOf(otherAccount.address)).to.be.equal(990); // feee! 10000 / (100 / 10) - 1% fee

      expect(await tokenContract.feeBalance()).to.be.equal(10)
      expect(await tokenContract.balanceOf(await tokenContract.getAddress())).to.be.equal(10)
      await tokenContract._burnFee()
      expect(await tokenContract.feeBalance()).to.be.equal(0)
      expect(await tokenContract.balanceOf(await tokenContract.getAddress())).to.be.equal(0)
    });
  });
  describe("Naming", function () {
    it("Should return correct naming of my token", async function () {
      const { tokenContract } = await loadFixture(deployTokenFixture);

      expect(await tokenContract.name()).to.be.equal("Vote Max Token");
      expect(await tokenContract.symbol()).to.be.equal("VTM");
    })
  })

  describe("MyERC", function () {
    async function deployERC20Fixture() {
      const [owner, otherAccount, otherAccount2] = await ethers.getSigners();
      const ERC20 = await ethers.getContractFactory("Token");
      const erc20Contract = await ERC20.deploy(owner.address);
      await erc20Contract._mint(owner, 100);
      return { erc20Contract, owner, otherAccount, otherAccount2 };
    }
  
    describe("transfer", function () {
      it("Should fail when address_to is bad", async function () {
        const { erc20Contract, otherAccount } = await loadFixture(deployERC20Fixture);

        await expect(erc20Contract.transfer("0x0000000000000000000000000000000000000000", 100)).to.be.reverted;
      });
      
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
      it("Should fail when spender is address0", async function () {
        const { erc20Contract } = await loadFixture(deployERC20Fixture);
        await expect (erc20Contract.approve("0x0000000000000000000000000000000000000000", 100)).to.be.reverted;
  
      });
      it("Should allow approving and transferring tokens with correct amount", async function () {
        const { erc20Contract, owner, otherAccount } = await loadFixture(deployERC20Fixture);
        await erc20Contract.approve(otherAccount.address, 100);
        await erc20Contract.connect(otherAccount).transferFrom(owner.address, otherAccount.address, 100);
  
        expect(await erc20Contract.balanceOf(otherAccount.address)).to.equal(100);
      });
  
      it("Should revert when transferring tokens with insufficient allowance", async function () {
        const { erc20Contract, owner, otherAccount } = await loadFixture(deployERC20Fixture);
        await expect(erc20Contract.connect(otherAccount).transferFrom(owner.address, otherAccount.address, 100)).to.be.revertedWithCustomError(erc20Contract, "ERC20InsufficientAllowance");
      });
    });
  });
  
});
