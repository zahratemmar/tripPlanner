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

async function verifySmartContracts () {
    let argsArr = []
    console.log("verifying smart contracts")
    let trips = await pullValidTrips(false);
    let paymentIds = trips.map((trip) => trip.transactions.tripData.participators).flat();
    paymentIds = paymentIds.map((obj) => obj.paymentId);
    console.log("payment ids pulled : ")
    console.log(paymentIds)
    console.log("payment ids detected : ")
    const payments = await getBlockChain(false); 
    for (const payment of payments) {
        console.log(payment.index)
        if (paymentIds.includes(payment.index)) {
            console.log("passed")
            argsArr.push(payment.transactions.arguments)
            paymentIds = paymentIds.filter(id => id !== payment.transactions.tripId);
            if (paymentIds.length === 0) break;
        }
    } 
    await prepareTemplate(false);
    let paymentResults = await Promise.all(argsArr.map(arg => executePayment(arg)));
    paymentResults = paymentResults.map((result) => JSON.parse(result))
    paymentResults = paymentResults.map((payment) => payment.ditribution).flat();
    paymentResults = paymentResults.reduce((acc, { bankUrl, amount }) => {
        acc[bankUrl] = (acc[bankUrl] || 0) + amount;
        return acc;
      }, {});
      
    paymentResults = Object.entries(paymentResults).map(([bankUrl, amount]) => ({ bankUrl, amount }));
    trips = trips.map(trip =>({ ...trip, payed : true }))
    await Promise.all(trips.map(trip => updateJsonFile(tripBC,trip,false)))
    await fs.unlink('paymentTemplate.js', (err) => {
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




async function deployPayment (chosenTrip,participationData) {
    
    console.log("deploying the payment")
    const prevBlock =await getLastBlock(false)
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
     privateKey = await getPrivateKey()
     const hash = sign.sign(privateKey, "hex");
     BlockData["hash"]=hash
     await updateJsonFile("db/payments.json",BlockData,false)
     return index;
}





module.exports = { executePayment, verifySmartContracts, deployPayment };
