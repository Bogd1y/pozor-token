// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./MyERC.sol";
import "./Ownable.sol";

contract Token is MyERC, Ownable {
    uint public tokenPrice = 100; // 10 per 1 wei
    uint256 public fee = 1;
    uint256 public feeBalance;

    constructor(address initOwner) Ownable(initOwner) MyERC(10) {}

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    function setBuyFeePercentage(uint256 _fee) external onlyOwner {
        require(_fee >= 1 && _fee <= 10, "Fee is not in valid range");
        fee = _fee;
    }

    event TokensSwapped(address sender, uint amount);

    /// @notice mint tokens to account
    /// @param account address
    /// @param value value that should be minted
    function _mint(address account, uint256 value) external onlyOwner {
        require(account != address(0), "Wrong account");
        _update(address(0), account, value);
    }

    /// @notice burn tokens from account
    /// @param account address
    /// @param value value that should be burned
    function _burn(address account, uint256 value) external onlyOwner {
        require(account != address(0), "Wrong account");
        _update(account, address(0), value);
    }

    function _beforeBuy() internal virtual {}
    function _beforeSell() internal virtual {}

    /// @notice swap eth to VTM
    function _buy() public payable {
        _beforeBuy();

        require(msg.value >= tokenPrice / _decimals, "Lack of power!");
        // uint256 tokenAmount = msg.value / (tokenPrice / _decimals);
        uint256 tokenAmount = msg.value * _decimals / tokenPrice;

        if (tokenAmount >= 100) {
            uint curentFee = (tokenAmount * fee) / 100;
            tokenAmount -= curentFee;
            _update(address(0), address(this), curentFee);
            feeBalance += curentFee;
        }

        _update(address(0), msg.sender, tokenAmount);

        emit TokensSwapped(msg.sender, tokenAmount);
    }

    /// @notice swap VTM to eth
    /// @param tokenAmount amount to swap
    function _sell(uint256 tokenAmount) public {
        _beforeSell();

        require(balanceOf(msg.sender) >= tokenAmount, "Lack of power!");

        require(
            address(this).balance >= (tokenAmount * tokenPrice) / _decimals,
            "I don't have enough eth :( "
        );

        uint curentFee = (tokenAmount * fee) / 100;
        tokenAmount -= curentFee;

        _update(msg.sender, address(0), tokenAmount);
        _update(msg.sender, address(this), curentFee);
        feeBalance += curentFee;

        payable(msg.sender).transfer((tokenAmount * tokenPrice) / _decimals);

        emit TokensSwapped(msg.sender, tokenAmount);
    }

    /// Get rid of fee
    function _burnFee() public onlyOwner {
        _update(address(this), address(0), feeBalance);
        feeBalance = 0;
    }
}
