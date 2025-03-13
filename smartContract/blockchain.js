const fs = require('fs');

const { TextEncoder, TextDecoder } = require('util');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { time } = require('console');
const { generateKeyPairSync, createSign, createVerify } = crypto;

const inputFilePath = "smartContract.bin";  

 
 
 function Blockchain(nodeUrl){
    this.tripCounter =0;
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
      });
      this.publicKey=publicKey;
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
   // this.createGenisis();
    fs.writeFile("keys.json",JSON.stringify({publicKey, privateKey}), (err) => {
        if (err) {
            console.error("Error writing file:", err);
            return;
        } 
      });
    });
}
 
Blockchain.prototype.createGenisis = function() {
    const newBlock = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions: null,
        hash: "000000000000",
        previousBlockHash: "00000000000000",
        creatorNodeUrl: this.currentNodeUrl,
    };
    this.pendingTransactions = [];
    this.updateJsonFile("db/trips.json",newBlock,true)
    this.updateJsonFile("db/payments.json",newBlock,true)
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
                    if(stdout == "trip added"){
                        this.tripCounter++;
                    }
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
}


/*Blockchain.prototype.checkSmartContract = async function() {
    return new Promise((resolve, reject ) => {
        const trips = this.pullValidTrips();
    });
}



Blockchain.prototype.pullValidTrips = async function() {
    return new Promise((resolve, reject ) => {
        fs.readFile("db/trips.json", 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }
            let blocks;
            let trips = [];
            try {
                blocks = JSON.parse(data).slice(0, -1);
                blocks.forEach((block, index) => {
                    
                });
                



            } catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
                return;
            }
        });

    });
}


*/



Blockchain.prototype.addParticipation = async function(participationData) {
    const validTripBlock =await this.isValidTrip(participationData.tripId);
    console.log("done")
    if(!validTripBlock){
        console.log("none")
        return ({status : -1, message : "trip not valid"});
    }
    
    console.log("trip valid")
    this.reserveSpot(validTripBlock.transactions,participationData)
    await this.deployPayment(validTripBlock.transactions,participationData);
}



Blockchain.prototype.reserveSpot = async function(transactions,participationData) {
    
    console.log("reserving a spot")
    transactions.tripData.availableSpots--;
    transactions.tripData.participators.push(participationData.participator)

    BlockData = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions ,
        creatorNodeUrl:  this.currentNodeUrl,
        previousBlockHash: this.getLastBlock(true).hash

    }
    const dataAsString =JSON.stringify(BlockData);
    const sign = createSign("SHA256");
    sign.update(dataAsString);
    sign.end();
    privateKey =JSON.parse(fs.readFileSync("keys.json", 'utf8')).privateKey
    const hash = sign.sign(privateKey, "hex");
    BlockData["hash"]=hash
    
    console.log("new trip block")
    console.log(BlockData)
    this.updateJsonFile("db/trips.json",BlockData,false)
}






Blockchain.prototype.deployPayment = async function(chosenTrip,participationData) {
    
    console.log("deploying the payment")
    const BlockData = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions: {
            tripId : chosenTrip.tripData.id,
            exeDate : chosenTrip.tripData.enddate,
            amount : participationData.amount,
            tripLength:(chosenTrip.tripData.enddate - chosenTrip.tripData.startdate),
            transport : {
                tid : chosenTrip.transportData.tid,
                amount : chosenTrip.transportData.price
            },
            house : {
                hid : chosenTrip.houseData.hid,
                amount : chosenTrip.houseData.price 
            },
            guide : {
                gid : chosenTrip.guideData.gid,
                amount : chosenTrip.guideData.price 
            },
            arguments : chosenTrip.tripData.id+" "+participationData.amount+" " + (chosenTrip.tripData.enddate - chosenTrip.tripData.startdate)+ " " + chosenTrip.transportData.tid + " " + chosenTrip.transportData.price + " " + chosenTrip.houseData.hid + " " + chosenTrip.houseData.price + " " + chosenTrip.guideData.gid + " " + chosenTrip.guideData.price,
        },
        creatorNodeUrl:  this.currentNodeUrl,
        previousBlockHash: await this.getLastBlock(false).hash,
     }
     const dataAsString =JSON.stringify(BlockData);
     const sign = createSign("SHA256");
     sign.update(dataAsString);
     sign.end();
     privateKey =JSON.parse(fs.readFileSync("keys.json", 'utf8')).privateKey
     const hash = sign.sign(privateKey, "hex");
     BlockData["hash"]=hash
     console.log("new payment block")
     console.log(BlockData)
     this.updateJsonFile("db/payments.json",BlockData,false)

}


Blockchain.prototype.getLastBlock = async function(flag) {
   return new Promise((resolve, reject) => {
    const file = flag ? "db/trips.json" : "db/payments.json"
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            reject();
        }
        let block;
        try {
            block = JSON.parse(data)[0];
            resolve (block);
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            reject();
        }
    });
});
}





Blockchain.prototype.isValidTrip = async function(tripId){
    return new Promise((resolve, reject) => {
  
    console.log("validating the tripis = " + tripId)
    fs.readFile("db/trips.json", 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading file:", err);
        return;
    }
    let blocks;
    let trips = [];
    try { 
        blocks = JSON.parse(data).slice(0, -1);
        for (const block of blocks) {
            if(block.transactions.tripData.id == tripId){
                console.log("verifiying date and availability")
                console.log("date now :"+ Date.now() + " startdate : "+block.transactions.tripData.startdate)
                console.log("availale spots : "+block.transactions.tripData.availableSpots)
                if(block.transactions.tripData.availableSpots > 0 && block.transactions.tripData.startdate > Date.now()){
                    console.log("returning block")
                    resolve (block);
                }
            }
        }
        console.log("trip not valid")
        resolve (null);
        
    } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        return;
    }
    });
  });

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