pragma solidity ^0.5.8;

contract MultiSign {

    event Deposit(address indexed from, uint256 value);
    event Execution(
        address indexed from, 
        uint256 value, 
        address indexed to, 
        uint256 gasLimit, 
        bytes data, 
        bool success, 
        bytes result
    );
    event Shutdown(address indexed from, bool shutdown);

    //Query Owners of this wallet
    address[] public owners;
    //Minimal number of signatures to make a execution call
    uint256 public threshold;
    //To avoid replay from diferent networks 
    uint256 public chainId;
    //To avoid replay of the same transaction
    uint256 public nonce;

    bool internal _lock;
    bool internal _shutdown;

    string constant HEADER = "\x19Ethereum Signed Message:\n32";

    mapping(address => bool) internal _isOwner;
    mapping(uint256 => bool) internal _usedNonce;

    constructor(
        address[] memory _owners, 
        uint256 _threshold, 
        uint256 _chainId
    ) 
    public 
    {
        require(_threshold > 0, 'Threshold not valid');
        require(_owners.length >= _threshold, 'invalid peers addresses');
        
        threshold = _threshold;
        owners = _owners;
        chainId = _chainId;
        
        for(uint256 i = 0; i < owners.length; i++) {
           require(!_isOwner[owners[i]] && owners[i] != address(0x0)); 
            _isOwner[owners[i]] = true;

        }
    }

    function getOwners() external view returns(address[] memory) {
        return owners; 
    }
    
    function() external payable {
        if(msg.value > 0) {
            emit Deposit(msg.sender, msg.value);
        }
    }
    
    function execute(
        bytes calldata _signatures,
        uint256 _nonce,
        uint256 _amount, 
        address payable _destination, 
        uint256 _gasLimit, 
        bytes calldata _data
    ) 
    external 
    shutdown(_destination)
    {
        require(!_usedNonce[nonce], 'nonce used');
        
        bytes32 _hash = keccak256(
            abi.encodePacked
                (HEADER, 
                 keccak256(abi.encodePacked(_nonce, _amount, _destination, _gasLimit, _data))
                )
        );

        address _testAddr = address(0x0);
        address _lastAddr = address(0x0);
        uint256 i;
       
        while(i < threshold) {
            _testAddr = recovery(_hash, _signatures, i);
            require(_lastAddr < _testAddr, 'signatures order should be ASC and unique');
            require(_isOwner[_testAddr], 'not peer');            
            _lastAddr = _testAddr;
            i++;
        }

        require(i == threshold, "threshold not meet");
       
        bool success;
        bytes memory result;
        
        (success, result) = _execute(_amount, _destination, _gasLimit, _data);
        require(success, 'executing external call');
        nonce = nonce + 1;

        //Emit execution event
        emit Execution(msg.sender, _amount, _destination, _gasLimit, _data, success, result);
        //return (success, result);
    }


    function setShutdown(bool _isShutdown) external isOwner {
        _shutdown = _isShutdown;
        emit Shutdown(msg.sender, _shutdown);
    }


    function getShutdown() external view returns(bool) {
        return _shutdown;
    }       


    function recovery(bytes32 _hash, bytes memory _signatures, uint256 _index) internal pure returns(address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        (r,s,v) = _slice(_signatures, _index);
        return ecrecover(_hash, v, r, s);
    }


		
    //Slice the bytes to signatures;
    function _slice(bytes memory _signatures, uint256 _index) internal pure returns(bytes32 r, bytes32 s, uint8 v) {
        
        assembly {
            let _offset := mul(_index, 65) 
            r := mload(add(_signatures, add(32, _offset)))
            s := mload(add(_signatures, add(64, _offset)))
            v := and(mload(add(_signatures, add(65, _offset))), 0xff)
        }

        if(v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "signature invalid, not v==27 || v==28");

    }


    function _execute(
        uint256 _amount, 
        address payable _destination, 
        uint256 _gasLimit, 
        bytes memory _data
    ) 
    internal
    lock
    returns(bool, bytes memory) 
    {
        return _destination.call.gas(_gasLimit).value(_amount)(_data);
    }


    modifier isOwner {
        require(_isOwner[msg.sender], 'not owner');
        _;
    }


    modifier lock {
        require(!_lock, 'resource in use');
        
        _lock = true;
        _;
        _lock = false;
    }

    modifier shutdown(address _dest) {
        if(_shutdown) {
            require(_isOwner[_dest]);
        } 
        _;
    }
}
