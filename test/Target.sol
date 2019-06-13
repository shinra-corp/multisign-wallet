pragma solidity ^0.5.8;

contract Target {

    constructor() public {

    }
    //Test if is possible to call wallet in the middle of a trasaction
    function() external payable {
        address target = msg.sender;
        bytes32 recall = keccak256("execute(bytes,uint256,uint256,address,uint256,bytes calldata)");

    }
}
