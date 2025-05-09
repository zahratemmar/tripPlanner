const fs = require('fs');
const crypto = require('crypto');
const { generateKeyPairSync, createSign, createVerify } = crypto;
const { v4: uuidv4 } = require('uuid');
const { timeStamp } = require('console');


class TripPlanner {
    constructor(url) {
        this.creatorNodeUrl=url
        this.port  = url.split(":")[2]
        this.housesFile = `db/${this.port}/houses.json`;
        this.test = `db/${this.port}/testResult.json`;
        this.keys = `db/${this.port}/keys.json`;
        this.descriptionFile = `db/${this.port}/description.json`;
        this.transportFile = `db/${this.port}/transport.json`;
        this.guidesFile = `db/${this.port}/guides.json`;
        this.tripsFile = `db/${this.port}/trips.json`;
        this.privateKey =JSON.parse(fs.readFileSync(this.keys, 'utf8')).privateKey
        this.writeData(this.test,{file : this.guidesFile})

    }

    readData(file) {
        if (!fs.existsSync(file)) return [];
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }

    writeData(file, data) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }

    addHousing(hid, location, startDate, endDate, price,spots,bankUrl) {
        let houses = this.readData(this.housesFile);
        let discs = this.readData(this.descriptionFile);
        const description = discs.find(disc => disc.id === hid);
        discs = discs.filter(disc => disc.id !== hid);
        this.writeData(this.descriptionFile, discs);
        const house = { 
            id: uuidv4(), 
            hid, location, 
            startDate, 
            endDate, 
            price ,
            spots,
            bankUrl,
            description:description.description,
            timestamp: Date.now(),
        }
        houses.push(house);
        this.writeData(this.housesFile, houses);
        this.checkTrips({house})
    }

    addTransportation(tid, location, startDate, endDate, price,spots,bankUrl) {
        let transports = this.readData(this.transportFile);
        let discs = this.readData(this.descriptionFile);
        const description = discs.find(disc => disc.id === tid);
        discs = discs.filter(disc => disc.id !== tid);
        this.writeData(this.descriptionFile, discs);

        const transport = { 
            id: uuidv4(), 
            tid, 
            location, 
            startDate, 
            endDate, 
            price ,
            spots,
            bankUrl,
            description:description.description,
            timestamp: Date.now()
        }
       
        transports.push(transport);
        this.writeData(this.transportFile, transports);
        this.checkTrips({transport})
    }

    addGuiding(gid, location, startDate, endDate, price,spots,bankUrl) {
        let guides = this.readData(this.guidesFile);
        let discs = this.readData(this.descriptionFile);
        const description = discs.find(disc => disc.id === gid);
        discs = discs.filter(disc => disc.id !== gid);
        this.writeData(this.descriptionFile, discs);

        const guide = { 
            id: uuidv4(), 
            gid, 
            location, 
            startDate, 
            endDate, 
            price ,
            spots,
            bankUrl,
            description:description.description,
            timestamp: Date.now()
        }
        guides.push(guide);
        this.writeData(this.guidesFile, guides);
        this.checkTrips({guide})
    }

    addPlannedTrip(tripData,transportData, houseData ,guideData) {
        let trips = this.readData(this.tripsFile);
        const previousBlockHash=trips[0].hash
        const tripCounter = trips[0].tripCounter + 1;
        const currentBlockData = {
                index: uuidv4(),
                timestamp: Date.now(),
                transactions: {
                    tripData ,
                    houseData,
                    guideData,
                    transportData
                }, 
                payed : false,
                tripCounter,
                creatorNodeUrl:  this.creatorNodeUrl,
                previousBlockHash: previousBlockHash,
             }
        const dataAsString =JSON.stringify(currentBlockData, Object.keys(currentBlockData).sort())
        const sign = createSign("SHA256");
        sign.update(dataAsString);
        sign.end();
        const hash = sign.sign(this.privateKey, "hex");
        currentBlockData["hash"]=hash
        trips.unshift(currentBlockData);
        this.writeData(this.tripsFile, trips);
        return {trip : currentBlockData}
    }

    doDatesOverlap(start1, end1, start2, end2) {
        return start1 <= end2 && start2 <= end1;
    }

    ending(a, b, c) {
        return Math.min(a, b, c);
    }

    starting(a, b, c) {
        return Math.max(a, b, c);
    }

    removeData(file, index) {
        let data = this.readData(file);
        if (index >= 0 && index < data.length) {
            data.splice(index, 1);
            this.writeData(file, data);
        }
    }

    checkTrips(service) {
        let houses = this.readData(this.housesFile);
        let transport = this.readData(this.transportFile);
        let guides = this.readData(this.guidesFile);
        let trips = this.readData(this.tripsFile);
        let newtrip = false;
        for (let house of houses) {//going through house services
            for (let trans of transport) {//going through transport services
                if (house.location === trans.location && this.doDatesOverlap(trans.startDate, trans.endDate, house.startDate, house.endDate)) {
                    //checking the location and date overlap
                    for (let guidee of guides) {//going through guide services
                        if (guidee.location === house.location && this.doDatesOverlap(guidee.startDate, guidee.endDate, house.startDate, house.endDate)) {
                            let startdate = this.starting(guidee.startDate, trans.startDate, house.startDate);
                            let enddate = this.ending(guidee.endDate, trans.endDate, house.endDate);
                            let exists = trips.some(trip => 
                                this.doDatesOverlap(startdate, enddate, trip.startDate, trip.endDate) ||
                                trip.location === guidee.location
                            );//checing if there is a similar trip to the one generated
                            if (!exists) {
                                let price = (trans.price + guidee.price + house.price) * (enddate - startdate)/ (1000 * 60 * 60 * 24);
                                let spots = this.ending(guidee.spots, trans.spots, house.spots);
                                //calculating the cost,number of spots and the dates
                                let tripData = {
                                    id : uuidv4(),
                                    tid :trans.id,
                                    gid :guidee.id, 
                                    hid :house.id, 
                                    location : guidee.location, 
                                    startdate, 
                                    enddate, 
                                    price,
                                    availableSpots : spots,
                                    spots,
                                    participators : []
                                }
                                const trip = this.addPlannedTrip(tripData,trans ,house,guidee);//adding the trip by mining a block
                                console.log(JSON.stringify(trip))//returning the trip as STDOUT for the node to catch it
                                newtrip = true;
                                this.removeData(this.guidesFile, guides.indexOf(guidee));
                                this.removeData(this.housesFile, houses.indexOf(house));
                                this.removeData(this.transportFile, transport.indexOf(trans));//removing the matched services
                            }
                        }
                    }
                }
            }
        }
    if (!newtrip) console.log(JSON.stringify(service)); //in case there's no trip , returning the service as STDOUT for the node to catch it
    }
}



process.env.NODE_OPTIONS = "--openssl-legacy-provider";
tripPlanner = new TripPlanner(process.argv[10])

if(process.argv[2] == "house") 
     tripPlanner.addHousing(
    process.argv[3],
    process.argv[4],
    parseInt(process.argv[5],10),
    parseInt(process.argv[6],10),
    parseInt(process.argv[7],10),
    parseInt(process.argv[8],10),
    process.argv[9],
)

if(process.argv[2] == "guide")
     tripPlanner.addGuiding(
        process.argv[3],
        process.argv[4],
        parseInt(process.argv[5],10),
        parseInt(process.argv[6],10),
        parseInt(process.argv[7],10),
        parseInt(process.argv[8],10),
        process.argv[9],
        process.argv[10],
    )
if(process.argv[2] == "transport")
     tripPlanner.addTransportation(
        process.argv[3],
        process.argv[4],
        parseInt(process.argv[5],10),
        parseInt(process.argv[6],10),
        parseInt(process.argv[7],10),
        parseInt(process.argv[8],10),
        process.argv[9],
        process.argv[10],
    )