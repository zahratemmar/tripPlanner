const fs = require("fs").promises;
const crypto = require("crypto");
const { generateKeyPairSync } = crypto;
const { updateJsonFile } = require("./utils");
const { v4: uuidv4 } = require("uuid");

function createGenesisBlocks(files) {
    return new Promise(async (resolve, reject) => {
        try {
            const [tripData, paymentData] = await Promise.all([
                fs.readFile("smartContract.bin", "utf8"),
                fs.readFile("smartContract2.bin", "utf8"),
            ]);
            let key;
            const tripGenisis = { id: 0, data: tripData };
            const paymentGenisis = { id: 0, data: paymentData };
            let keys = await fs.readFile(files.keys, 'utf-8');
            keys=keys.trim()
            if (!keys || keys === '{}' || keys === '[]'){
                console.log("No keys found, generating new keys...");
                 const{ privateKey, publicKey } = generateKeyPairSync("rsa", {
                modulusLength: 2048, 
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }})
                await fs.writeFile(files.keys, JSON.stringify({ publicKey, privateKey }));
                key=publicKey
              
            }else{ 
                const keys = await fs.readFile(files.keys, 'utf-8');
                const { publicKey, privateKey } = JSON.parse(keys); 
                console.log("Keys found, using existing keys...");
                key=publicKey
            }
            const newBlock = {
                index: uuidv4(),
                timestamp: Date.now(),
                transactions: paymentGenisis,
                hash: "000000000000",
                previousBlockHash: "00000000000000",
                creatorNodeUrl: this.currentNodeUrl,
            };
            await updateJsonFile(files.payments, newBlock, true);
            newBlock.transactions = tripGenisis;
            newBlock.tripCounter = 0;
            await updateJsonFile(files.trips, newBlock, true);
            resolve(key); 
        } catch (error) {
            console.error("Error creating genesis blocks:", error);
            reject(error); 
        }
    });
}







module.exports = { createGenesisBlocks};
