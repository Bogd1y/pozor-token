// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Token.sol";
import "hardhat/console.sol";

contract VoteMaxToken is Token {

  uint public timeToVote = 60 * 60 * 24 * 3; // 3 days

  event VotingStarted(address starter, uint price, uint value);
  event VotingEnded(address ender, uint price);
  event Voted(address voter, uint price, uint value);
  event HighestVotedPriceNowChanged(uint priceNow);

  mapping(uint count => mapping(uint price => uint value)) votingPrices;
  mapping(uint count => mapping(address => bool)) hasVoted;
  
  // uint public tokenPrice = 100;
  bool public isVotingGoing = false;
  uint public endDate;
  uint public highestVotedPriceNow;
  uint public currentVoteCount = 1;

  constructor() Token(msg.sender) {}

  function setTimeToVote(uint _time) external onlyOwner {
    timeToVote = _time;
  }

  function setTokenPrice(uint _tokenPrice) external onlyOwner {
    tokenPrice = _tokenPrice;
  }

  function getTimeLeft() public view returns(uint) {
    return endDate - block.timestamp; 
  }
  // TODO ADD MORE GET FOr CLIENT 

  modifier notVoted() {
    require(!hasVoted[currentVoteCount][msg.sender], "You are participating in vote!");
    _;
  }
  modifier isVoting() {
    require(isVotingGoing, "There is no voting there!");
    _;
  }

  modifier hasTimeToVote() {
    if (endDate != 0) {
      require(block.timestamp < endDate, "Time to vote has ended!");
    }
    _;
  }

  function startVoting(uint _price) public notVoted hasTimeToVote {
    uint voterBalance = balanceOf(msg.sender);

    require(voterBalance >= _totalSupply / 1000, "You are not 0.1% holder!");
    require(votingPrices[currentVoteCount][_price] == 0, "Such option already exist!");

    votingPrices[currentVoteCount][_price] = voterBalance;
    hasVoted[currentVoteCount][msg.sender] = true;

    if (!isVotingGoing) { 
      isVotingGoing = true;
      endDate = block.timestamp + timeToVote;
      highestVotedPriceNow = _price;
    } else if (voterBalance > highestVotedPriceNow) {
      highestVotedPriceNow = _price;
      emit HighestVotedPriceNowChanged(highestVotedPriceNow);
    }

    emit VotingStarted(msg.sender, _price, voterBalance);
  }

  function vote(uint _price) public notVoted hasTimeToVote isVoting {

    uint voterBalance = balanceOf(msg.sender);

    require(voterBalance >= _totalSupply * 5 / 10000 , "You are not 0.05% holder!");
    require(votingPrices[currentVoteCount][_price] > 0, "No such vote option!");

    votingPrices[currentVoteCount][_price] += voterBalance;

    if (votingPrices[currentVoteCount][_price] > highestVotedPriceNow) {
      highestVotedPriceNow = _price;
      emit HighestVotedPriceNowChanged(highestVotedPriceNow);
    }

    hasVoted[currentVoteCount][msg.sender] = true;
    emit Voted(msg.sender, _price, voterBalance);
  }

  function endVote() public isVoting {
    require(block.timestamp > endDate, "Time to vote has not ended!");
    
    tokenPrice = highestVotedPriceNow;
    isVotingGoing = false;
    endDate = 0;
    highestVotedPriceNow = 0;
    currentVoteCount++;
  }

  function _beforeBuy() internal override notVoted {}
  function _beforeSell() internal override notVoted {}
  function _beforeTransfer() internal override notVoted {}
  function _beforeTransferFrom() internal override notVoted {}

}