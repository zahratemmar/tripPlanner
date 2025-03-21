const fs = require("fs").promises;
const { createVerify } = require("crypto");

const tripBC = "db/trips.json";
const PaymentBC = "db/payments.json";


async function getLastBlock(files,flag) {
    const file = flag ? files.trips : files.payments;
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data)[0];
}

async function getBlockChain(files,flag) {
    const file = flag ? files.trips : files.payments;
    const data = await fs.readFile(file, "utf8");
    return JSON.parse(data);
}

/*async function isValidTrip(tripId) {
    const data = await fs.readFile(files.trips, "utf8");
    const blocks = JSON.parse(data);
    
    for (const block of blocks) {
        if (block.transactions.tripData.id === tripId && block.transactions.tripData.availableSpots > 0) {
            return block;
        }
    }

    return null;
}*/

async function updateJsonFile(filePath, newData, flag) {
    console.log("pushing new data ")
    let data = [];
        try {
            const existingData = await fs.readFile(filePath, "utf8");
            data = JSON.parse(existingData);
        } catch (err) {
            console.error("Error reading file, creating new one.");
        }
    if(flag) data.push(newData);
    else data.unshift(newData);
await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}



async function prepareTemplate (files,flag) {
    return new Promise(async (resolve, reject ) => {
        console.log("files : "+files)
        console.log("getting the template")
        const data = await getGenisisTemplate(files,flag)
        console.log("writing the template")
        const file = flag ? "tripPlannerTemplate.js":"paymentTemplate.js"
        await fs.writeFile(file, data);
        resolve();
    })
}


async function getGenisisTemplate(files,flag) {
    return new Promise(async (resolve, reject) => {
        const file = flag ? files.trips : files.payments;
        console.log("file : "+files)
        console.log("flag : "+flag)
        const fileData = await fs.readFile(file, "utf8");
        jsonData=JSON.parse(fileData);
        let bytes=jsonData[jsonData.length - 1].transactions.data;
        const byteArray = bytes.split(" ").map(Number);
        const byteBuffer = new Uint8Array(byteArray);
        const code = new TextDecoder().decode(byteBuffer);
        resolve(code);
    })

}

async function isValidTrip(files, tripId){
    return new Promise(async (resolve, reject) => {
  
    console.log("validating the tripis = " + tripId)
    const data =await fs.readFile(files.trips, 'utf8')
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
 

}

async function pullValidTrips(files,flag) {
    return new Promise(async (resolve, reject ) => {
        const data = await fs.readFile(files.trips, 'utf8') 
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
}


async function getPrivateKey(files) {
  const data = await fs.readFile(files.keys, "utf8");
    return JSON.parse(data).privateKey;

}

async function getAllServices (){
    const filePaths = [files.guides,files.houses,files.transport];
    try {
        const filePromises = filePaths.map((filePath) => fs.readFile(filePath, 'utf8'));
        const filesData = await Promise.all(filePromises);
        const allServices = filesData.map((data) => JSON.parse(data));
        return allServices;
    } catch (error) {
        console.error("Error reading files:", error);
        throw error;
    }

}


async function isvalidBlock(files,block , publicKey,flag) {
    const prevBlock = await getLastBlock(files,flag)
    if (block.previousBlockHash !== prevBlock.hash) {
        console.error("Invalid block: previous hash does not match");
        return false;
    }
    console.log("verifying the hash ...")

    const blockHash=block.hash
    delete block.hash
    const verify = createVerify("SHA256");
    const dataAsString=JSON.stringify(block, Object.keys(block).sort())
    verify.update(dataAsString);
    verify.end();
     const result =  verify.verify(publicKey, blockHash, "hex");
     block["hash"]=blockHash
    return result
}
 

async function verifyleader(finalLeader,block){
    const index = finalLeader.indexOf(block.creatorNodeUrl)
    if(index!== -1) return finalLeader[index]
    else return null
}


module.exports = { 
    getLastBlock, 
    getBlockChain,
    isValidTrip, 
    updateJsonFile ,
    prepareTemplate,
    pullValidTrips,
    getPrivateKey,
    getAllServices,
    isvalidBlock,
    verifyleader
};
