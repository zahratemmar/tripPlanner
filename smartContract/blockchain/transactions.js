const { exec } = require("child_process");
const fs = require("fs").promises;
const { deployPayment } = require("./payments");
const { v4: uuidv4 } = require("uuid");
const { createSign } = require("crypto");
const { getLastBlock,updateJsonFile ,isValidTrip,prepareTemplate, getPrivateKey,storeDiscription} = require("./utils");

async function addService(
    nodeUrl,//the node url incase a new block is mined (creatoNodeURl)
    files,//links to the bd files
    houseData,//service data
    service//service type(guide/transport/house)
    ) {
    return new Promise(async (resolve, reject) => {
        await storeDiscription(files, houseData.id,houseData.description);//placeholder to store data temperarily
        await prepareTemplate(files,true);//preparing the template to execute later
        console.log("running the smart contract (addService)")
        const command = `node tripPlannerTemplate.js ${service} ${houseData.id} ${houseData.location} ${houseData.startDate} ${houseData.endDate} ${houseData.price} ${houseData.spots} ${houseData.bankUrl} ${nodeUrl}`;
        //executing the template with data as args
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
                );//resolving the result
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
    transactions.tripData.availableSpots=transactions.tripData.availableSpots-participationData.spots;//dereasing the number of spots
    transactions.tripData.participators.push({
        participator : participationData.participator,
        paymentId,
        spots : participationData.spots,
        amount : participationData.spots*transactions.tripData.price
    })//pushing the new participator's data
    const prevBlock = await getLastBlock(files,true)
    BlockData = {
        index: uuidv4(),
        timestamp: Date.now(),
        transactions ,
        payed : false,
        tripCounter : prevBlock.tripCounter,
        creatorNodeUrl:  currentNodeUrl,
        previousBlockHash: prevBlock.hash
    }//preparing the blok using the old version
    const dataAsString =JSON.stringify(BlockData, Object.keys(BlockData).sort());
    const sign = createSign("SHA256");
    sign.update(dataAsString);
    sign.end();
    privateKey = await getPrivateKey(files)
    const hash = sign.sign(privateKey, "hex");//hashing data
    BlockData["hash"]=hash
    await updateJsonFile(files.trips,BlockData,false)//pushing the new block
    return BlockData
}


async function getService(settings,files){
    let file = settings.service =="house" ? files.houses : files.transport
    file = settings.service =="guide" ? files.guides : file
    console.log("file : "+file)
    const data = await fs.readFile(file, 'utf8');
    let service = JSON.parse(data);

    if(settings.location){
        service = service.filter((service) => service.location === settings.location);
    }
    console.log(service)
    return service;
}

async function cancelTrip(tripId,files,nodeUrl) {
    const trip = await isValidTrip(files, tripId);
    if (!trip) return { status: -1, message: "Trip not valid" };
    const prevBlock = await getLastBlock(files,true)
    BlockData = {//preparing the new data block exactly as previously but declaring the trip as out of service
        index: uuidv4(),
        timestamp: Date.now(),
        transactions : trip.transactions,
        payed : true,
        tripCounter : prevBlock.tripCounter--,
        creatorNodeUrl: nodeUrl ,
        previousBlockHash: prevBlock.hash
    }
    const dataAsString =JSON.stringify(BlockData, Object.keys(BlockData).sort());
    const sign = createSign("SHA256");
    sign.update(dataAsString);
    sign.end();
    privateKey = await getPrivateKey(files)
    const hash = sign.sign(privateKey, "hex");//hashing the block data
    BlockData["hash"]=hash
    await updateJsonFile(files.trips,BlockData,false)//pushing the new block
    return {
        trip : blockData,
        participators : trip.transactions.tripData.participators,//returning the participators for the api to repay
        tripData : {//returning trip data for the api to send emails
            startsDate : trip.transactions.tripData.startdate,
            endDate : trip.transactions.tripData.enddate,
            location : trip.transactions.tripData.location,
        }
    }
    
}




module.exports = { addService, addParticipation ,getService,cancelTrip};
