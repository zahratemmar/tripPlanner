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
    const allIds = trips.map(item => [//collecting service providers ids for the ratings
        item.transactions.guideData.gid,
        item.transactions.houseData.hid,
        item.transactions.transportData.tid
    ]).flat();
    let paymentIds = trips.map((trip) => trip.transactions.tripData.participators).flat();
    paymentIds = paymentIds.map((obj) => obj.paymentId);
    const payments = await getBlockChain(files,false); 
    for (const payment of payments) {//exptracting payments from trip that was pulled
        console.log(payment.index)
        if (paymentIds.includes(payment.index)) {
            argsArr.push(payment.transactions.arguments)
            paymentIds = paymentIds.filter(id => id !== payment.transactions.tripId);
            if (paymentIds.length === 0) break;
        }
    } 
    await prepareTemplate(files, false);//preparing the template
    let paymentResults = await Promise.all(argsArr.map(arg => executePayment(arg)));//executing all payments and returning results
    paymentResults = paymentResults.map((result) => JSON.parse(result))
    paymentResults = paymentResults.map((payment) => payment.ditribution).flat();
    paymentResults = paymentResults.reduce((acc, { bankUrl, amount }) => {
        acc[bankUrl] = (acc[bankUrl] || 0) + amount;
        return acc;
      }, {});//filtering results for the api
    paymentResults = Object.entries(paymentResults).map(([bankUrl, amount]) => ({ bankUrl, amount }));
    const prevBlock=await getLastBlock(files , true)
    let previousBlockHash = prevBlock.hash
    privateKey = await getPrivateKey(files)
    console.log("trips validated : "+ trips.length)
    for (const trip of trips) {//preparing and pushing a new block for each trip that got validated with the satatus "payed"
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
    fs.unlink('paymentTemplate.js', (err) => {//deleting the template
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
    
    console.log("ids ", allIds)
    return {allIds,paymentResults };
   
}




async function deployPayment (files, chosenTrip,participationData,currentNodeUrl) {
    
    console.log("deploying the payment")
    const prevBlock =await getLastBlock(files , false)//getting the last block to use hash
    const index = uuidv4();//generating a unique id
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
            spots : participationData.spots,
            transport : {//transport data (id,bankurl ,amount)
                tid : chosenTrip.transportData.tid,
                bankUrl : chosenTrip.transportData.bankUrl,
                amount : chosenTrip.transportData.price
            },
            house : {//house data (id,bankurl ,amount)
                hid : chosenTrip.houseData.hid,
                bankUrl: chosenTrip.houseData.bankUrl,
                amount : chosenTrip.houseData.price 
            }, 
            guide : {//guide data (id,bankurl ,amount)
                gid : chosenTrip.guideData.gid,
                bankUrl: chosenTrip.guideData.bankUrl,
                amount : chosenTrip.guideData.price 
            },
            arguments : chosenTrip.tripData.id+" "+participationData.amount+" " + tripLength+ " " + chosenTrip.transportData.bankUrl + " " + chosenTrip.transportData.price + " " + chosenTrip.houseData.bankUrl + " " + chosenTrip.houseData.price + " " + chosenTrip.guideData.bankUrl + " " + chosenTrip.guideData.price+" "+ participationData.spots,
        }, 
        creatorNodeUrl:  currentNodeUrl,
        previousBlockHash: prevBlock.hash,//to link the block with the previous one
     }
     const dataAsString =JSON.stringify(BlockData, Object.keys(BlockData).sort());
     const sign = createSign("SHA256");
     sign.update(dataAsString);
     sign.end(); 
     privateKey = await getPrivateKey(files)
     const hash = sign.sign(privateKey, "hex");//hashin the new block
     BlockData["hash"]=hash
     await updateJsonFile(files.payments,BlockData,false)//pushing the block
     return BlockData;
}





module.exports = { executePayment, verifySmartContracts, deployPayment };
