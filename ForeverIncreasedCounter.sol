// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ForeverIncreasedCounter {
    uint256 private count;
    
    event CounterIncreased(uint256 newCount, address increasedBy);
    
    constructor() {
        count = 0;
    }
    
    function increment() public {
        count += 1;
        emit CounterIncreased(count, msg.sender);
    }
    
    function getCount() public view returns (uint256) {
        return count;
    }
}