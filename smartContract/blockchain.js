function Blockchain(){
    this.chain= [];
    this.pendingTransactions = [];
    this.currentNodeUrl = "currentNodeUrl";
    this.currentNodeReputation = 0; 
    this.currentNodeRoles = null;
    //aware of all the other node that inside of our network
    this.networkNodes = [];
    // this.smartContractManager = new SmartContractManager();
    this.createNewBlock('0' , '0', true, null, null);
    // this.smartContractManager.createAndStoreTravelContracts ();
    //this.networkHelpers = new NetworkHelpers();
}

Blockchain.prototype.createNewBlock = function(previousBlockHash, hash, isGenesis = false, creatorNodeUrl, creatorReputation) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        hash: hash,
        previousBlockHash: previousBlockHash,
        creatorNodeUrl: isGenesis ? null : creatorNodeUrl,
        creatorReputation: isGenesis ? null : creatorReputation 
    };
    this.pendingTransactions = [];
    this.chain.push(newBlock);
    return newBlock;
};

module.exports = Blockchain;