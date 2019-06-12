/*
 *Mnemonic (Ganache): citizen home donor pepper arrow group gallery liberty neutral outer return alcohol
 */

const { 
    BN, 
    constants, 
    balance,
    expectEvent, 
    expectRevert
} = require('openzeppelin-test-helpers');

chai = require('chai')
, expect = chai.expect
, should = chai.should();

const Wallet = artifacts.require("MultiSign");

var account1 = {
    addr: "0x361caDAD984c5e5A4e695A001793364D4A153ec5",
    pk: "0x358739417a53b506ef2c3cd2ed5f5d3b7a09f9be8fdce6bc1321cfbbb8cd0def", 
    signature: "" 
}
var account2 = {
    addr: "0x70AD3Be8a44Cc542b3DBeFC31fb3C39f7b2bffe6",
    pk: "0x444fc495516eb70e6d400ed4da762028d48c3b8d2ce1acf82b9aa15feaed62f9",
    signature: "" 
}
var account3 = {
    addr:"0x0E2f84C3CbF0A5daa47d0dFa8Ab51Fd5BA195CA0",
    pk:"0x4c064f3c5a50e682b36f9aea8dd85b4f60fc1884c0848d63552910caf8f2205c", 
    signature: ""
}
var account4 = {
    addr: "0x5B71De37f441eE0A874d37d54E2ae74D472573fB",
    pk: "433b72472d99a8ae0681e870fa2c2585a40454ee3b7d7a021e5389f9d4079dde",
	signature: ""
}
var account5 = {
	addr: "0xa77d709d38Ef88B60312114fA27a644D2fB05CFA",
	pk:	"41fd771de6a7cd4af41dde139cbb05e8e98e0e9333df53232e6a1567a3ec5877",
	signature: ""
}


contract("Deployment Tests", async accounts => {
    
    let instance;
    let owners = new Array(account1.addr, account2.addr, account3.addr);
    let threshold = 3;
    let chainId = 5777;

    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId);
    });

    it("should start with a zero nonce", async () => {
        assert.equal(await instance.nonce(), 0, "should be a zero nonce");
    });

    it("should be in the right network", async () => {
        assert.equal(await instance.chainId(), chainId, "should have the right network id");
    });

    it("should have the right owners", async () => {
        let _owners = await instance.getOwners();
        expect(_owners).to.have.members(owners);
    });

});



contract("MultiSignature deployment negative tests", async accounts => {
    let instance;
    let owners = new Array(accounts[0], accounts[1], accounts[2]);
    let threshold = 2;
    let chainId = 5777;

    it("should not continue without a treshold", async () => {
        expectRevert(Wallet.new(owners, 0, chainId), "Threshold not valid");
    });

    it("should not continue without a proper more owners than threshold", async () => {
        let minOwners = new Array(accounts[0]);
        expectRevert(Wallet.new(owners, 4, chainId), "invalid peers addresses");
        expectRevert(Wallet.new(minOwners, threshold, chainId), "invalid peers addresses");
    });
});


contract("MultiSignature Deposit Ether", async accounts => {
    let instance;
    let owners = new Array(accounts[0], accounts[1], accounts[2]);
    let threshold = 2;
    let chainId = 5777;

    let amount = web3.utils.toWei("1", "ether");

    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId); 
    });

    it("should have the correct balance", async () => {
        
        const balanceTracker = await balance.tracker(instance.address);
        await instance.sendTransaction({value: amount});
        (await balanceTracker.delta()).should.be.bignumber.equal(amount);
    });

    it("should emit Deposit event", async () => {
       
        var {logs} = await instance.sendTransaction({value:amount}); 
        expectEvent.inLogs(logs, "Deposit", {from: accounts[0], value: amount});
    });
});
contract("Shutdown change of state", async accounts => {
    let instance;
    let owners = new Array(accounts[0], accounts[1], accounts[2]);
    let threshold = 2;
    let chainId = 5777;

    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId);
    });

    it("should change shutdown state", async () => {
        let state = await instance.getShutdown();
        await instance.setShutdown(true, {from: accounts[0]});

        assert.notEqual(state, await instance.getShutdown(), "Shutdown state do not change");
    }); 

    it("should emit shutdown event", async () => {
        var {logs} = await instance.setShutdown(true, {from: accounts[0]});
        expectEvent.inLogs(logs, "Shutdown", {from: accounts[0], shutdown : true})
    });

});

contract("Signatures Tests", async accounts => {

    let instance;
    let owners = new Array(account1.addr, account2.addr, account3.addr);
    let threshold = 3;
    let chainId = 5777;
    let nonce = 1;
    let gasLimit = 1;
    let data = "0x";

    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId);
        
        let amount =  web3.utils.toWei("1", "ether");
        await instance.sendTransaction({value: amount});
    });

    it("validate signature", async () => {
        let amount = web3.utils.toWei("1", "ether");
        let destination = accounts[5];
        let prefix = "\x19Ethereum Signed Message:\n32";
        let hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);

        account1.signature = await web3.eth.accounts.sign(hash, account1.pk);
        account2.signature = await web3.eth.accounts.sign(hash, account2.pk);
        account3.signature = await web3.eth.accounts.sign(hash, account3.pk);

        let _objs = new Array(
            account1,
            account2,
            account3
        )

        let finalSign = _objs.sort((a,b) => a.addr > b.addr);
        let signatures = finalSign.map(a => a.signature.signature.replace('0x', '')).join('');
        await instance.execute('0x' + signatures, nonce, amount, destination, gasLimit, data);
    });
});
