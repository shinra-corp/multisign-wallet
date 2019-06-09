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

contract("Shutdown change of state negative test", async accounts => {

    let instance;
    let owners = new Array(accounts[0], accounts[1], accounts[2]);
    let threshold = 2;
    let chainId = 5777;

    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId);
    });

    it("Should not change if not owner", async () => {
        await expectRevert(instance.setShutdown(false, {from:accounts[7]}), "not owner");
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

contract("Signatures Negative Tests", async accounts => {

    let instance;
    let owners = new Array(account1.addr, account2.addr, account3.addr);
    let fk_owners = new Array(accounts[5], accounts[6], accounts[7]);
    let threshold = 3;
    let fk_threshold = 2;
    let chainId = 5777;
    let fk_chainId = 5778;
    let nonce = 1;
    let fk_nonce = 2;
    let gasLimit = 1;
    let fk_gasLimit = 2;
    let data = "0x";
    let fk_data = "0x1234";
    let amount = web3.utils.toWei("1", "ether");
    let fk_amount = web3.utils.toWei("10", "ether");
    let destination = accounts[5];
    let fk_destination = accounts[0];
    let prefix = "\x19Ethereum Signed Message:\n32";
    
    beforeEach("deploy a new instance", async () => {
        instance = await Wallet.new(owners, threshold, chainId);
        
        let amount =  web3.utils.toWei("1", "ether");
        await instance.sendTransaction({value: amount});
    });

    it("valid signature wrong parameters", async () => {
        let hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);
        let fk_hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);

        account1.signature = await web3.eth.accounts.sign(hash, account1.pk);
        account2.signature = await web3.eth.accounts.sign(hash, account2.pk);
        account3.signature = await web3.eth.accounts.sign(hash, account3.pk);

        let _objs = new Array(
            account1,
            account2,
            account3
        );

        let finalSign = _objs.sort((a,b) => a.addr > b.addr);
        let signatures = finalSign.map(a => a.signature.signature.replace('0x', '')).join('');
        
        //Try to execute a different transaction from the sign one;
        await expectRevert(instance.execute('0x' + signatures, fk_nonce, amount, destination, gasLimit, data), 'not peer');
        await expectRevert(instance.execute('0x' + signatures, nonce, fk_amount, destination, gasLimit, data), 'not peer');
        await expectRevert(instance.execute('0x' + signatures, nonce, amount, fk_destination, gasLimit, data), 'not peer');
        await expectRevert(instance.execute('0x' + signatures, nonce, amount, destination, fk_gasLimit, data), 'not peer');
        await expectRevert(instance.execute('0x' + signatures, nonce, amount, destination, gasLimit, fk_data), 'not peer');
    });

    it("valid parameters with wrong signature", async () => {
        let hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);

        account1.signature = await web3.eth.accounts.sign(hash, account1.pk);
        account2.signature = await web3.eth.accounts.sign(hash, account2.pk);
        account3.signature = await web3.eth.accounts.sign(hash, account3.pk);

        let _objs = new Array(
            account1,
            account2,
            account3
        );

        let finalSign = _objs.sort((a,b) => a.addr > b.addr);
        let fk_signatures = finalSign.map(a => a.signature.signature.replace('0x', '').replace('4', '3')).join('');
        
        await expectRevert(instance.execute('0x' + fk_signatures, nonce, amount, destination, gasLimit, data), 'not peer');
    });

    it("omit signature", async() => {
        await expectRevert(instance.execute('0x00000000000000000000', nonce, amount, destination, gasLimit, data), 'signature order should be ASC');

    })

    it("should revert without correct num. signatures", async () => {
    
        let hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);

        account1.signature = await web3.eth.accounts.sign(hash, account1.pk);
        account2.signature = await web3.eth.accounts.sign(hash, account2.pk);

        let _objs = new Array(
            account1,
            account2
        );

        let finalSign = _objs.sort((a,b) => a.addr > b.addr);
        let signatures = finalSign.map(a => a.signature.signature.replace('0x', '')).join('');

        console.log(signatures);
        
        await expectRevert(instance.execute('0x' + signatures, nonce, amount, destination, gasLimit, data), 'not peer');
    });

    it("should not accept the same signature 2x", async () => {
        
        let hash = await web3.utils.soliditySha3(nonce, amount, destination, gasLimit, data);

        account1.signature = await web3.eth.accounts.sign(hash, account1.pk);
        account2.signature = await web3.eth.accounts.sign(hash, account2.pk);
        account3.signature = await web3.eth.accounts.sign(hash, account3.pk);

        let _objs = new Array(
            account1,
            account2,
            account1
        );

        let finalSign = _objs.sort((a,b) => a.addr > b.addr);
        let signatures = finalSign.map(a => a.signature.signature.replace('0x', '')).join('');
        
        await expectRevert(instance.execute('0x' +signatures, nonce, amount, destination, gasLimit, data), 'not peer');
    });
     
});

    /*
    //tests : wrong parameters - Done
    //alter signatures - Done
    //omit signature
    //less than threshold
    //same singnature 3x
    //same signature 2x
    //change order 
    //feed another signature of a not peers address
    */

