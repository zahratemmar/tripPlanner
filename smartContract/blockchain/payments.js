const { exec } = require("child_process");
const { updateJsonFile , getLastBlock, prepareTemplate ,getBlockChain ,pullValidTrips,getPrivateKey} = require("./utils");
const fs = require("fs").promises;
const crypto = require("crypto");
const { generateKeyPairSync, createSign, createVerify } = crypto;
const { v4: uuidv4 } = require("uuid");
const tripBC = "db/trips.json";


async function executePayment(args) {
    return new Promise((resolve, reject) => {
        const command = `node paymentTemplate.js ${args}`;
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                reject({ status: -1, message: "Payment execution failed" });
            } else {
                resolve(stdout);
            }
        });
    });
}

async function verifySmartContracts (files,currentNodeUrl) {
    let argsArr = []
    console.log("verifying smart contracts")
    let trips = await pullValidTrips(files, false);
    let paymentIds = trips.map((trip) => trip.transactions.tripData.participators).flat();
    paymentIds = paymentIds.map((obj) => obj.paymentId);
    console.log("payment ids pulled : ")
    console.log(paymentIds)
    console.log("payment ids detected : ")
    const payments = await getBlockChain(files,false); 
    for (const payment of payments) {
        console.log(payment.index)
        if (paymentIds.includes(payment.index)) {
            console.log("passed")
            argsArr.push(payment.transactions.arguments)
            paymentIds = paymentIds.filter(id => id !== payment.transactions.tripId);
            if (paymentIds.length === 0) break;
        }
    } 
    console.log("files : "+files)
    console.log("preparing templte")
    await prepareTemplate(files, false);
    let paymentResults = await Promise.all(argsArr.map(arg => executePayment(arg)));
    console.log(paymentResults)
    paymentResults = paymentResults.map((result) => JSON.parse(result))
    paymentResults = paymentResults.map((payment) => payment.ditribution).flat();
    paymentResults = paymentResults.reduce((acc, { bankUrl, amount }) => {
        acc[bankUrl] = (acc[bankUrl] || 0) + amount;
        return acc;
      }, {});
      
    paymentResults = Object.entries(paymentResults).map(([bankUrl, amount]) => ({ bankUrl, amount }));
    console.log(paymentResults)
    const prevBlock=await getLastBlock(files , true)
    console.log("prev block"+ prevBlock.hash)
    let previousBlockHash = prevBlock.hash
    privateKey = await getPrivateKey(files)
    console.log("trips validated : "+ trips.length)
    for (const trip of trips) {
        trip["payed"] = true;
        trip["previousBlockHash"] = previousBlockHash;
        trip["tripCounter"]--;
        trip["creatorNodeUrl"]=currentNodeUrl
        const sign = createSign("SHA256");
        delete trip.hash
        const dataAsString=JSON.stringify(trip, Object.keys(trip).sort())
        sign.update(dataAsString);
        sign.end();
        previousBlockHash = sign.sign(privateKey, "hex");
        trip["hash"] = previousBlockHash;
        await updateJsonFile(files.trips, trip, false);
    }
    fs.unlink('paymentTemplate.js', (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return({ 
                status : -1,
                message : "failed to save service"
            })
        } else { 
            console.log('File deleted successfully');
            console.log("after treatement blocks r "+ trips.length)
        }
    });
            return {paymentResults, trips};
   
}




async function deployPayment (files, chosenTrip,participationData,currentNodeUrl) {
    
    console.log("deploying the payment")
    const prevBlock =await getLastBlock(files , false)
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
        creatorNodeUrl:  currentNodeUrl,
        previousBlockHash: prevBlock.hash,
     }
     const dataAsString =JSON.stringify(BlockData, Object.keys(BlockData).sort());
     const sign = createSign("SHA256");
     sign.update(dataAsString);
     sign.end(); 
     privateKey = await getPrivateKey(files)
     const hash = sign.sign(privateKey, "hex");
     BlockData["hash"]=hash
     await updateJsonFile(files.payments,BlockData,false)
     return BlockData;
}





module.exports = { executePayment, verifySmartContracts, deployPayment };
