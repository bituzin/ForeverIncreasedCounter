/**
 *Submitted for verification at basescan.org on 2025-10-20
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ForeverIncreasedCounterv02 {
    uint256 private count;
    uint256 public lastIncrementTime;
    
    struct IncreaseRecord {
        uint256 count;
        address increasedBy;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    IncreaseRecord[] private increaseHistory;
    
    event CounterIncreased(uint256 newCount, address increasedBy);
    
    constructor() {
        count = 0;
        lastIncrementTime = block.timestamp;
    }
    
    function increment() public {
        count += 1;
        lastIncrementTime = block.timestamp;
        increaseHistory.push(IncreaseRecord({
            count: count,
            increasedBy: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        emit CounterIncreased(count, msg.sender);
    }
    
    function getCount() public view returns (uint256) {
        return count;
    }
    
    function getIncreaseHistory() public view returns (IncreaseRecord[] memory) {
        return increaseHistory;
    }
    
    function getIncreaseHistoryCount() public view returns (uint256) {
        return increaseHistory.length;
    }
    
    function getIncreaseRecord(uint256 index) public view returns (IncreaseRecord memory) {
        require(index < increaseHistory.length, "Index out of bounds");
        return increaseHistory[index];
    }
    
    function getTimeSinceLastIncrement() public view returns (uint256) {
        return block.timestamp - lastIncrementTime;
    }
}