const { exec } = require("child_process");
const fs = require("fs").promises;
const { deployPayment } = require("./payments");
const { v4: uuidv4 } = require("uuid");
const { createSign } = require("crypto");
const { getLastBlock,updateJsonFile ,isValidTrip,prepareTemplate, getPrivateKey} = require("./utils");

async function addService(houseData, service) {
    return new Promise(async (resolve, reject) => {
        console.log("preparing template")
        await prepareTemplate(true);
        console.log("running the template")
        const command = `node tripPlannerTemplate.js ${service} ${houseData.id} ${houseData.location} ${houseData.startDate} ${houseData.endDate} ${houseData.price} ${houseData.spots} ${houseData.bankUrl}`;
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error("Error executing service:", error || stderr);
                reject({ status: -1, message: "Failed to save service" });
            } else {
                resolve({ status: 1, message: "Service saved successfully" });
            }
        });
    });
}

async function addParticipation(participationData) {
    try {
        console.log("add part")
        const validTripBlock = await isValidTrip(participationData.tripId);
        console.log("valid trip", validTripBlock)
        if (!validTripBlock) return { status: -1, message: "Trip not valid" };
        console.log("deploying payment")
        const paymentId = await deployPayment(validTripBlock.transactions, participationData);
        console.log("reserving spot")
        await reserveSpot(validTripBlock.transactions, participationData, paymentId);

        return { status: 1, message: "Participation added successfully" };
    } catch (err) {
        console.error("Error adding participation:", err
        );
        return { status: -1, message: "Failed to save participation" };
    }
}



async function reserveSpot(transactions,participationData,paymentId) {
    console.log("reserving a spot")
    transactions.tripData.availableSpots--;
    transactions.tripData.participators.push({
        participator : participationData.participator,
        paymentId
    })
    const prevBlock = await getLastBlock(true)
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
    privateKey = await getPrivateKey()
    const hash = sign.sign(privateKey, "hex");
    BlockData["hash"]=hash
    await updateJsonFile("db/trips.json",BlockData,false)
}





module.exports = { addService, addParticipation };
