const { createGenesisBlocks } = require("./genesis");
const { addService, addParticipation , getService } = require("./transactions");
const { verifySmartContracts, executePayment } = require("./payments");
const { 
    getLastBlock, 
    getBlockChain, 
    isValidTrip,
    getAllServices ,
    updateJsonFile,
    isvalidBlock,
    verifyleader,
    deleteUsedServices,
    verifyChains
} = require("./utils");

function Blockchain(nodeUrl,port) {
    this.tripCounter = 0;
    this.port=port
    this.currentNodeUrl = nodeUrl;
    this.currentNodeReputation = 0;
    this.currentNodeRoles = null;
    this.networkNodes = [];
    this.files = {
        guides : "db/"+port+"/guides.json",
        transport : "db/"+port+"/transport.json",  
        houses : "db/"+port+"/houses.json", 
        trips : "db/"+port+"/trips.json",  
        payments : "db/"+port+"/payments.json",
        keys : "db/"+port+"/keys.json",
        test :  "db/"+port+"/testResult.json"
    }
    this.publicKey = null;
}

Blockchain.prototype.addService = addService;
Blockchain.prototype.addParticipation = addParticipation;
Blockchain.prototype.verifySmartContracts = verifySmartContracts;
Blockchain.prototype.executePayment = executePayment;
Blockchain.prototype.getLastBlock = getLastBlock;
Blockchain.prototype.getBlockChain = getBlockChain;
Blockchain.prototype.isValidTrip = isValidTrip;
Blockchain.prototype.getAllServices = getAllServices;
Blockchain.prototype.updateJsonFile = updateJsonFile;
Blockchain.prototype.isvalidBlock = isvalidBlock;
Blockchain.prototype.deleteUsedServices = deleteUsedServices;
Blockchain.prototype.verifyChains=verifyChains
Blockchain.prototype.verifyleader= verifyleader 
Blockchain.prototype.getService=getService


module.exports = Blockchain;
