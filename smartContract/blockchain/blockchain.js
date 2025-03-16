const { createGenesisBlocks } = require("./genesis");
const { addService, addParticipation } = require("./transactions");
const { verifySmartContracts, executePayment } = require("./payments");
const { getLastBlock, getBlockChain, isValidTrip,getAllServices } = require("./utils");

function Blockchain(nodeUrl) {
    this.tripCounter = 0;
    this.currentNodeUrl = nodeUrl;
    this.currentNodeReputation = 0;
    this.currentNodeRoles = null;
    this.networkNodes = [];
    this.publicKey = createGenesisBlocks()
}

Blockchain.prototype.addService = addService;
Blockchain.prototype.addParticipation = addParticipation;
Blockchain.prototype.verifySmartContracts = verifySmartContracts;
Blockchain.prototype.executePayment = executePayment;
Blockchain.prototype.getLastBlock = getLastBlock;
Blockchain.prototype.getBlockChain = getBlockChain;
Blockchain.prototype.isValidTrip = isValidTrip;
Blockchain.prototype.getAllServices = getAllServices;
module.exports = Blockchain;
