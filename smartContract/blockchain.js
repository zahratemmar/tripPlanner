const fs = require('fs');
const fsp = require('fs').promises;
const { TextEncoder, TextDecoder } = require('util');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { time } = require('console');
const { generateKeyPairSync, createSign, createVerify } = crypto;

const tripPlannerContract = "smartContract.bin"; 
const PaymentContract = "smartContract2.bin";   
const tripBC = "db/trips.json";
const PaymentBC = "db/payments.json";
 
  
 function Blockchain(nodeUrl){
    this.tripCounter =0;
    this.currentNodeUrl = nodeUrl;
    this.currentNodeReputation = 0; 
    this.currentNodeRoles = null;
    this.networkNodes = [];
    fs.readFile(tripPlannerContract, 'utf8', (err, tripData) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        } 
        tripGenisis = {
            id : 0,
            data : tripData
        };
        fs.readFile(PaymentContract, 'utf8', (err, paymentData) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }
    
            paymentGenisis = {
             id : 0,
             data : paymentData
            };
            this.createGenisis(tripGenisis,paymentGenisis);

             const { privateKey, publicKey } = generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" }
            });
            this.publicKey=publicKey;

            fs.writeFile("keys.json",JSON.stringify({publicKey, privateKey}), (err) => {
                if (err) {
                    console.error("Error writing file:", err);
                    return;
                } 
            });
        });
    });
}
 

Blockchain.prototype.createGenisis = async function(tripGenisis,paymentGenisis) {
    const newBlock = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions: paymentGenisis,
        hash: "000000000000",
        previousBlockHash: "00000000000000",
        creatorNodeUrl: this.currentNodeUrl,
    }; 
    await this.updateJsonFile(PaymentBC,newBlock,true)
    newBlock.transactions = tripGenisis;
    newBlock.tripCounter = 0;
    await this.updateJsonFile(tripBC,newBlock,true)
};



Blockchain.prototype.addService = async function(houseData,service) {
    return new Promise(async (resolve, reject) => {
            await this.prepareTemplate(true);
                const command = "node tripPlannerTemplate.js "+service+" "+houseData.id+" "+houseData.location+" "+houseData.startDate+" "+houseData.endDate+" "+houseData.price+" "+houseData.spots+" "+houseData.bankUrl+" "+this.currentNodeUrl;
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error: ${error.message}`);
                        reject({
                            status : -1,
                            message : "failed to save service"
                        })
                    }  
                    if (stderr) {
                        console.error(`Stderr: ${stderr}`);
                        reject({
                            status : -1,
                            message : "failed to save service"
                        })
                    }
                    console.log(`Output: ${stdout}`);
                    if(stdout == "trip added"){
                        this.tripCounter++;
                    } 
                    fs.unlink('tripPlannerTemplate.js', (err) => {
                        if (err) {
                            console.error('Error deleting file:', err);
                            reject({
                                status : -1,
                                message : "failed to save service"
                            })
                        } else { 
                            console.log('File deleted successfully');
                            resolve( {
                                status : 1,
                                message : "service saved succesfully"
                            })
                        }
                    });
                }); 
        });
}

/*
Blockchain.prototype.checkSmartContract = async function() {
    return new Promise((resolve, reject ) => {
        const trips = this.pullValidTrips();
    });
}
  

*/


Blockchain.prototype.verifySmartContracts = async function() {
    let argsArr = []
    let trips = await this.pullValidTrips(false);
    let paymentIds = trips.map((trip) => trip.transactions.tripData.participators).flat();
    paymentIds = paymentIds.map((obj) => obj.paymentId);
    console.log("payment ids pulled : ")
    console.log(paymentIds)
    console.log("payment ids detected : ")
    const payments = await this.getBlockChain(false); 
    for (const payment of payments) {
        console.log(payment.index)
        if (paymentIds.includes(payment.index)) {
            console.log("passed")
            argsArr.push(payment.transactions.arguments)
            //let result =await this.executePayment(payment.transactions.arguments);
            //result = JSON.parse(result)
            //paymentResults.push(result)
            paymentIds = paymentIds.filter(id => id !== payment.transactions.tripId);
            if (paymentIds.length === 0) break;
        }
    } 
    await this.prepareTemplate(false);
    let paymentResults = await Promise.all(argsArr.map(arg => this.executePayment(arg)));
    paymentResults = paymentResults.map((result) => JSON.parse(result))
    paymentResults = paymentResults.map((payment) => payment.ditribution).flat();
    paymentResults = paymentResults.reduce((acc, { bankUrl, amount }) => {
        acc[bankUrl] = (acc[bankUrl] || 0) + amount;
        return acc;
      }, {});
      
      paymentResults = Object.entries(paymentResults).map(([bankUrl, amount]) => ({ bankUrl, amount }));
    trips = trips.map(trip =>({ ...trip, payed : true }))
    await Promise.all(trips.map(trip => this.updateJsonFile(tripBC,trip,false)))
    fs.unlink('paymentTemplate.js', (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return({ 
                status : -1,
                message : "failed to save service"
            })
        } else { 
            console.log('File deleted successfully');
        }
    });
    return paymentResults;
   
}


Blockchain.prototype.prepareTemplate = async function(flag) {
    return new Promise(async (resolve, reject ) => {
        const data = await this.getGenisisTemplate(flag)
        const file = flag ? "tripPlannerTemplate.js":"paymentTemplate.js"
        fs.writeFile( file, data, (err) => {
            if (err) {
                console.error("Error writing file:", err);
                reject();
            } else {
                console.log("File updated successfully!");
                resolve();
            }
        });
    })

}








Blockchain.prototype.executePayment = async function(args) {
    return new Promise((resolve, reject ) => {
        console.log(args)
        const command = "node paymentTemplate.js "+args;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                reject({
                    status : -1,
                    message : "failed to save service"
                })
            }  
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                reject({
                    status : -1,
                    message : "failed to save service"
                })
            }
            if(stdout){
                resolve(stdout)
            }
        });
    })
}









Blockchain.prototype.pullValidTrips = async function(flag) {
    return new Promise((resolve, reject ) => {
        fs.readFile("db/trips.json", 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                reject();
            }  
            let blocks;
            let validTrips = []
            let validTripsIds =[]
            let payedTripsId = []
            try { 
                blocks = JSON.parse(data).slice(0, -1);
                blocks.some((block) => {
                    let id=block.transactions.tripData.id
                    console.log("id = "+id)
                    if (block.payed && !payedTripsId.includes(id)){
                        console.log("payed")
                        payedTripsId.push(id)
                    } 
                    else if(!validTripsIds.includes(id) && !payedTripsId.includes(id)){
                        console.log("new")
                        if(flag && block.transactions.tripData.startdate > Date.now()){
                            console.log("flag1")
                            validTrips.push(block);
                            validTripsIds.push(id);
                        }else if(!flag /*&& block.transactions.tripData.enddate < Date.now()*/){
                            console.log("flag2")
                            validTrips.push(block);
                            validTripsIds.push(id);
                        }
                    } 
                })
                resolve(validTrips);
            } catch (parseErr) {
                console.error("Error :", parseErr);
                reject();
            }
        });

    });
}






Blockchain.prototype.addParticipation = async function (participationData) {
    try {
        const validTripBlock = await this.isValidTrip(participationData.tripId);
        if (!validTripBlock) {
            console.log("none");
            return { status: -1, message: "trip not valid" };
        }

        const paymentId = await this.deployPayment(validTripBlock.transactions, participationData);
        await this.reserveSpot(validTripBlock.transactions, participationData,paymentId);

        return { status: 1, message: "Participation added successfully" };
    } catch (err) {
        console.log(err);
        return { status: -1, message: "Failed to save participation" };
    }
};



Blockchain.prototype.reserveSpot = async function(transactions,participationData,paymentId) {
    console.log("reserving a spot")
    transactions.tripData.availableSpots--;
    transactions.tripData.participators.push({
        participator : participationData.participator,
        paymentId
    })
    const prevBlock = await this.getLastBlock(true)
    BlockData = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions ,
        payed : false,
        tripCounter : prevBlock.tripCounter,
        creatorNodeUrl:  this.currentNodeUrl,
        previousBlockHash: prevBlock.hash
    }
    const dataAsString =JSON.stringify(BlockData);
    const sign = createSign("SHA256");
    sign.update(dataAsString);
    sign.end();
    privateKey = await JSON.parse(fs.readFileSync("keys.json", 'utf8')).privateKey
    const hash = sign.sign(privateKey, "hex");
    BlockData["hash"]=hash
    this.updateJsonFile("db/trips.json",BlockData,false)
}






Blockchain.prototype.deployPayment = async function(chosenTrip,participationData) {
    
    console.log("deploying the payment")
    const prevBlock =await this.getLastBlock(false)
    const index = uuidv4();
    const tripLength = (chosenTrip.tripData.enddate - chosenTrip.tripData.startdate)/ (1000 * 60 * 60 * 24)
    const BlockData = {
        index,
        timestamp: Date.now(),
        transactions: {
            tripId : chosenTrip.tripData.id,
            exeDate : chosenTrip.tripData.enddate,
            amount : participationData.amount,
            participator : participationData.participator,
            tripLength,
            transport : {
                tid : chosenTrip.transportData.tid,
                bankUrl : chosenTrip.transportData.bankUrl,
                amount : chosenTrip.transportData.price
            },
            house : {
                hid : chosenTrip.houseData.hid,
                bankUrl: chosenTrip.houseData.bankUrl,
                amount : chosenTrip.houseData.price 
            }, 
            guide : {
                gid : chosenTrip.guideData.gid,
                bankUrl: chosenTrip.guideData.bankUrl,
                amount : chosenTrip.guideData.price 
            },
            arguments : chosenTrip.tripData.id+" "+participationData.amount+" " + tripLength+ " " + chosenTrip.transportData.bankUrl + " " + chosenTrip.transportData.price + " " + chosenTrip.houseData.bankUrl + " " + chosenTrip.houseData.price + " " + chosenTrip.guideData.bankUrl + " " + chosenTrip.guideData.price,
        }, 
        creatorNodeUrl:  this.currentNodeUrl,
        previousBlockHash: prevBlock.hash,
     }
     const dataAsString =JSON.stringify(BlockData);
     const sign = createSign("SHA256");
     sign.update(dataAsString);
     sign.end(); 
     privateKey = await JSON.parse(fs.readFileSync("keys.json", 'utf8')).privateKey
     const hash = sign.sign(privateKey, "hex");
     BlockData["hash"]=hash
     this.updateJsonFile("db/payments.json",BlockData,false)
     return index;
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
 


 Blockchain.prototype.getBlockChain = async function(flag) {
    return new Promise((resolve, reject) => {
     const file = flag ?tripBC : PaymentBC
     fs.readFile(file, 'utf8', (err, data) => {
         if (err) {
             console.error("Error reading file:", err);
             reject();
         }
         let blocks;
         try {
             blocks = JSON.parse(data);
             resolve (blocks);
         } catch (parseErr) {
             console.error("Error parsing JSON:", parseErr);
             reject();
         }
     });
    })
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
                if(block.transactions.tripData.availableSpots > 0 /*&& block.transactions.tripData.startdate > Date.now()*/){
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

Blockchain.prototype.getGenisisTemplate = async function(flag) {
    return new Promise((resolve, reject) => {
        const file = flag ? tripBC : PaymentBC
        fs.readFile(file, 'utf8', (err, fileData) => {
            if (err) {
                console.error("Error reading file:", err);
                reject();
            }
            jsonData=JSON.parse(fileData);
            let bytes=jsonData[jsonData.length - 1].transactions.data;
            const byteArray = bytes.split(" ").map(Number);
            const byteBuffer = new Uint8Array(byteArray);
            const code = new TextDecoder().decode(byteBuffer);
            resolve(code);
        });
    })

}







Blockchain.prototype.updateJsonFile = async function(inputFilePath, newElement,flag) {
    console.log("type" + typeof newElement)
    return new Promise((resolve, reject) => { 
    
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
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