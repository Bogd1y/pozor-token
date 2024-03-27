// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./MyERC.sol";
import "./Ownable.sol";

contract Token is MyERC, Ownable {

    uint public tokenPrice = 100;
    uint256 public fee = 1;
    uint256 public feeBalance;

    constructor(address initOwner) Ownable(initOwner) {}

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function setBuyFeePercentage(uint256 _fee) external onlyOwner {
        require(_fee >= 1 && _fee <= 10, "Sho?");
        fee = _fee;
    }

    event TokensSwapped(address sender, uint amount);

    function _mint(address account, uint256 value) external onlyOwner {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) external onlyOwner {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        // _totalSupply -= value;
        _update(account, address(0), value);
    }

    function _beforeBuy() internal virtual {}
    function _beforeSell() internal virtual {}

    function _buy() public payable {
        require(msg.value % tokenPrice == 0, "You should send exact amount to fit in price");
        uint256 tokenAmount = msg.value / tokenPrice;

        if(tokenAmount >= 100) {
            uint curentFee = (tokenAmount * fee) / 100;
            tokenAmount -= curentFee;
            feeBalance += curentFee;
        }

        require(msg.value > 0, "Lack of power!");

        _beforeBuy();

        _update(address(0), msg.sender, tokenAmount);

        emit TokensSwapped(msg.sender, tokenAmount);
    }

    function _sell(uint256 tokenAmount) public {
        _beforeSell();

        require(balanceOf(msg.sender) >= tokenAmount, "Lack of power!");

        _update(msg.sender, address(0), tokenAmount);

        emit TokensSwapped(msg.sender, tokenAmount);

        uint curentFee = (tokenAmount * fee) / 100;
        tokenAmount -= curentFee;
        feeBalance += curentFee;

        // address payable receiver = payable(msg.sender);
        // receiver.transfer(tokenAmount);
        payable(msg.sender).transfer(tokenAmount * tokenPrice);
    }

    function _burnFee() public onlyOwner {
        feeBalance = 0;
    }
}
