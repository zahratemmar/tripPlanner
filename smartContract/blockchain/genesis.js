const fs = require("fs").promises;
const crypto = require("crypto");
const { generateKeyPairSync } = crypto;
const { updateJsonFile } = require("./utils");
const { v4: uuidv4 } = require("uuid");
const tripBC = "db/trips.json";
const PaymentBC = "db/payments.json";

 function createGenesisBlocks() {
    try {
        const tripData =  fs.readFile("smartContract.bin", "utf8");
        const paymentData =  fs.readFile("smartContract2.bin", "utf8");

        const tripGenisis = { id: 0, data: tripData };
        const paymentGenisis = { id: 0, data: paymentData };

        const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
            publicKeyEncoding: { type: "spki", format: "pem" },
            privateKeyEncoding: { type: "pkcs8", format: "pem" }
        });

         fs.writeFile("keys.json", JSON.stringify({ publicKey, privateKey }));
        const newBlock = {
            index: uuidv4(),
            timestamp: Date.now(),
            transactions: paymentGenisis,
            hash: "000000000000",
            previousBlockHash: "00000000000000",
            creatorNodeUrl: this.currentNodeUrl,
        }; 
         updateJsonFile(PaymentBC,newBlock,true)
        newBlock.transactions = tripGenisis;
        newBlock.tripCounter = 0;
         updateJsonFile(tripBC,newBlock,true)
    
        return publicKey ;
    } catch (error) {
        console.error("Error creating genesis blocks:", error);
        throw error;
    }
}







module.exports = { createGenesisBlocks};
