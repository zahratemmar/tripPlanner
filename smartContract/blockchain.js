const fs = require('fs');

const { TextEncoder, TextDecoder } = require('util');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { generateKeyPairSync, createSign, createVerify } = crypto;

const inputFilePath = "smartContract.bin";  

 
 
 function Blockchain(nodeUrl){
    this.chainlength=0
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });
      this.privateKey=privateKey;
      this.publicKey=publicKey;
      /*console.log(typeof publicKey)
      const sign = createSign("SHA256");
      sign.update("hello");
      sign.end();
      const signature = sign.sign(privateKey, "hex");
      console.log(signature)
        */

    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }
    
    this.pendingTransactions = [{
        id : 0,
        data : data
    }];
    this.currentNodeUrl = nodeUrl;
    this.currentNodeReputation = 0; 
    this.currentNodeRoles = null;
    this.networkNodes = [];
    this.createNewBlock('0' , '0', true, null, null);
    fs.writeFile("keys.json",JSON.stringify({publicKey, privateKey}), (err) => {
        if (err) {
            console.error("Error writing file:", err);
            return;
        } 
      });
    });
}
 
Blockchain.prototype.createNewBlock = function(previousBlockHash, hash, isGenesis = false, creatorNodeUrl, creatorReputation) {
    const newBlock = {
        index: this.chainlength + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        hash: hash,
        previousBlockHash: previousBlockHash,
        creatorNodeUrl: isGenesis ? null : creatorNodeUrl,
        creatorReputation: isGenesis ? null : creatorReputation 
    };
    this.pendingTransactions = [];
    this.chainlength++;
    this.updateJsonFile("db/trips.json",newBlock,true)
    return newBlock;
};



 Blockchain.prototype.addHost = async function(hostData) {
  //  await this.updateJsonFile("db/houses.json",hostData,true);
    console.log("awaitttt")
    await this.execute(hostData,"house");

}


Blockchain.prototype.execute = async function(houseData,service) {
    console.log("executing")
    return new Promise((resolve, reject) => {
        console.log("heloooo")
        fs.readFile("db/trips.json", 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err); 
                return;
            }
            let jsonData;
            try {
                jsonData = JSON.parse(data); 
            } catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
                return;
            }
            console.log("code extracted")

            let bytes=jsonData[jsonData.length - 1].transactions[0].data;
            const byteArray = bytes.split(" ").map(Number);
            const byteBuffer = new Uint8Array(byteArray);
            const code = new TextDecoder().decode(byteBuffer);
            console.log("writing the temp file")
            fs.writeFile("temp.js",code, (err) => {
                if (err) {
                    console.error("Error writing file:", err);
                    return;
                }   
                console.log("temp ready")
                const command = "node temp.js "+service+" "+houseData.id+" "+houseData.location+" "+houseData.startDate+" "+houseData.endDate+" "+houseData.price+" "+this.currentNodeUrl;
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error: ${error.message}`);
                        return;
                    }  
                    if (stderr) {
                        console.error(`Stderr: ${stderr}`);
                        return;
                    }
                    console.log(`Output: ${stdout}`);
                    fs.unlink('temp.js', (err) => {
                        if (err) {
                            console.error('Error deleting file:', err);
                        } else {
                            console.log('File deleted successfully');
                            return {
                                status : 1,
                                message : "service saved succesfully"
                            }
                        }
                    });
                }); 
    
            });
        });
    });
 







  /* return new Promise((resolve, reject) => {
     fs.readFile("db/trips.json", 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err); 
            return;
        }
        let jsonData;
        try {
            jsonData = JSON.parse(data); 
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            return;
        }
        console.log("code extracted")
        let bytes=jsonData[jsonData.length - 1].transactions[0].data;
        const byteArray = bytes.split(" ").map(Number);
        const byteBuffer = new Uint8Array(byteArray);
        const code = new TextDecoder().decode(byteBuffer);
        console.log("writing the temp file")
        fs.writeFile("temp.js",code, (err) => {
            if (err) {
                console.error("Error writing file:", err);
                return;
            } 
            console.log("temp ready")
            exec('node smartContract.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error.message}`);
                    return;
                } 
                if (stderr) {
                    console.error(`Stderr: ${stderr}`);
                    return;
                }
                console.log(`Output: ${stdout}`);
            })
        
        });

    });

    
    });*/

}



Blockchain.prototype.updateJsonFile = async function(inputFilePath, newElement,flag) {
    return new Promise((resolve, reject) => { 
    
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }
        let jsonData;
        try {
            jsonData = JSON.parse(data); // Convert JSON string into object
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            return;
        }
        if (Array.isArray(jsonData)) {
            if(flag) jsonData.push(newElement);
            else jsonData.unshift(newElement);
        } else {
            console.error("The JSON is not an array.");
            return;
        }
        fs.writeFile(inputFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error("Error writing file:", writeErr);
            } else {
                console.log("File "+inputFilePath+" updated successfully!");
                resolve();
            }
        });
      });
    });
}







module.exports = Blockchain;