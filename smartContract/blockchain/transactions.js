const { exec } = require("child_process");
const fs = require("fs").promises;
const { deployPayment } = require("./payments");
const { v4: uuidv4 } = require("uuid");
const { createSign } = require("crypto");
const { getLastBlock,updateJsonFile ,isValidTrip,prepareTemplate, getPrivateKey} = require("./utils");

async function addService(nodeUrl,files, houseData, service) {
    return new Promise(async (resolve, reject) => {
        await prepareTemplate(files,true);
        console.log("running the smart contract (addService)")
        const command = `node tripPlannerTemplate.js ${service} ${houseData.id} ${houseData.location} ${houseData.startDate} ${houseData.endDate} ${houseData.price} ${houseData.spots} ${houseData.bankUrl} ${nodeUrl}`;
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                console.error("Error executing service:", error || stderr);
                reject({ status: -1, message: "Failed to save service" });
            } else {
                console.log(stdout)
                fs.unlink('tripPlannerTemplate.js', (err) => {
                    if (err) {
                        console.error('Error deleting file:', err);
                    } else {
                        console.log('File deleted successfully');
                        
                    }
                });
                resolve(
                    JSON.parse(stdout)
                );
            }
        });
    });
}

async function addParticipation(files, participationData,currentNodeUrl) {
    try {
        const validTripBlock = await isValidTrip(files, participationData.tripId);
        if (!validTripBlock) return { status: -1, message: "Trip not valid" };
        const payment = await deployPayment(files,validTripBlock.transactions, participationData,currentNodeUrl);
        const trip = await reserveSpot(files,validTripBlock.transactions, participationData, payment.index,currentNodeUrl);

        return { payment , trip };
    } catch (err) {
        console.error("Error adding participation:", err
        );
        return { status: -1, message: "Failed to save participation" };
    }
}



async function reserveSpot(files,transactions,participationData,paymentId,currentNodeUrl) {
    console.log("reserving a spot")
    transactions.tripData.availableSpots--;
    transactions.tripData.participators.push({
        participator : participationData.participator,
        paymentId
    })
    const prevBlock = await getLastBlock(files,true)
    BlockData = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions ,
        payed : false,
        tripCounter : prevBlock.tripCounter,
        creatorNodeUrl:  currentNodeUrl,
        previousBlockHash: prevBlock.hash
    }
    const dataAsString =JSON.stringify(BlockData, Object.keys(BlockData).sort());
    const sign = createSign("SHA256");
    sign.update(dataAsString);
    sign.end();
    privateKey = await getPrivateKey(files)
    const hash = sign.sign(privateKey, "hex");
    BlockData["hash"]=hash
    await updateJsonFile(files.trips,BlockData,false)
    return BlockData
}


async function getService(settings){
    const data = await fs.readFile(fsettings.ile, 'utf8');
    let service = JSON.parse(data);
    if(settings.location){
        service = service.filter((service) => service.location === settings.location);
    }
    return service;
}


module.exports = { addService, addParticipation ,getService};
