// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract crowdFunding {
    mapping(address => uint) public contributers;
    address public manager;
    uint public mininvestment;
    uint public raisedAmount;
    uint public deadline;
    uint public target;
    uint public noOfContributers;

    constructor(uint _target, uint _deadline) {
        // Correct the target to be in wei
        target = _target;
        deadline = block.timestamp + _deadline;
        manager = msg.sender;
        mininvestment = 100 wei; // mininvestment set to 100 wei
    }

    struct request {
        string description;
        address payable recipent;
        uint value;
        bool compleated;
        uint noOfVoters;
        mapping(address => bool) voters;
    }

    mapping(uint => request) public requests;
    uint public numRequests;

    function targetFn() public view returns (uint) {
    return target;
    }


    function sendEth() public payable {
        require(block.timestamp < deadline, "deadline has been passed");
        require(msg.value >= mininvestment, "min investement is 100 wei");
        if (contributers[msg.sender] == 0) {
            noOfContributers++;
        }
        contributers[msg.sender] += msg.value;
        raisedAmount += msg.value;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function refund() public {
        require(block.timestamp > deadline, "time not compleated yet");
        require(target > raisedAmount, "you are not eligible");
        require(contributers[msg.sender] > 0);
        address payable user = payable(msg.sender);
        user.transfer(contributers[msg.sender]);
        contributers[msg.sender] = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == manager, "only owner can call this function");
        _;
    }

    function CreateRequest(string memory _description, address payable _recipient, uint _value) public onlyOwner {
        require(_value > 0, "value must be grater than 0");
        request storage newRequest = requests[numRequests];
        numRequests++;
        newRequest.description = _description;
        newRequest.recipent = _recipient;
        newRequest.value = _value;
        newRequest.compleated = false;
        newRequest.noOfVoters = 0;
    }

    function voteRequest(uint _requestNo) public {
        require(contributers[msg.sender] > 0, "You must be a contributor");
        request storage thisRequest = requests[_requestNo];
        require(thisRequest.voters[msg.sender] == false, "You have already voted");
        thisRequest.voters[msg.sender] = true;
        thisRequest.noOfVoters++;
    }

    function makePayment(uint _requestNo) public onlyOwner {
        require(raisedAmount >= target, "Target not met");
        request storage thisRequest = requests[_requestNo];
        require(thisRequest.compleated == false, "The request has been completed");
        require(thisRequest.noOfVoters > noOfContributers / 2, "Majority does not support");
        thisRequest.recipent.transfer(thisRequest.value);
        thisRequest.compleated = true;
    }
}
