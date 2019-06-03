const Wallet = artifacts.require("MultiSign");

module.exports = function(deployer, network, accounts) {
    
    let owners = new Array(accounts[0], accounts[1], accounts[2]);
    let threshold = 3;
    let chainId = 5777;
    
    deployer.deploy(Wallet,owners, threshold, chainId);
}
