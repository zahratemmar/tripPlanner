const fs = require('fs');
const crypto = require('crypto');
const { generateKeyPairSync, createSign, createVerify } = crypto;
const { v4: uuidv4 } = require('uuid');
const { timeStamp } = require('console');


class TripPlanner {
    constructor(url) {
        this.housesFile = 'db/houses.json';
        this.transportFile = 'db/transport.json';
        this.guidesFile = 'db/guides.json';
        this.tripsFile = 'db/trips.json';
        this.privateKey =JSON.parse(fs.readFileSync("keys.json", 'utf8')).privateKey
        this.creatorNodeUrl=url
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
        houses.push({ id: uuidv4(), hid, location, startDate, endDate, price ,spots,bankUrl,timestamp: Date.now(),
        });
        this.writeData(this.housesFile, houses);
        this.checkTrips()
    }

    addTransportation(tid, location, startDate, endDate, price,spots,bankUrl) {
        let transport = this.readData(this.transportFile);
        transport.push({ id: uuidv4(), tid, location, startDate, endDate, price ,spots,bankUrl,timestamp: Date.now()});
        this.writeData(this.transportFile, transport);
        this.checkTrips()
    }

    addGuiding(gid, location, startDate, endDate, price,spots,bankUrl) {
        let guides = this.readData(this.guidesFile);
        guides.push({ id: uuidv4(), gid, location, startDate, endDate, price ,spots,bankUrl,timestamp: Date.now()});
        this.writeData(this.guidesFile, guides);
        this.checkTrips()
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
        const dataAsString =JSON.stringify(currentBlockData);
        const sign = createSign("SHA256");
        sign.update(dataAsString);
        sign.end();
        const hash = sign.sign(this.privateKey, "hex");
        currentBlockData["hash"]=hash
        trips.unshift(currentBlockData);
        this.writeData(this.tripsFile, trips);
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

    checkTrips() {
        let houses = this.readData(this.housesFile);
        let transport = this.readData(this.transportFile);
        let guides = this.readData(this.guidesFile);
        let trips = this.readData(this.tripsFile);

        for (let house of houses) {
            for (let trans of transport) {
                if (house.location === trans.location && this.doDatesOverlap(trans.startDate, trans.endDate, house.startDate, house.endDate)) {
                    for (let guidee of guides) {
                        if (guidee.location === house.location && this.doDatesOverlap(guidee.startDate, guidee.endDate, house.startDate, house.endDate)) {
                            let startdate = this.starting(guidee.startDate, trans.startDate, house.startDate);
                            let enddate = this.ending(guidee.endDate, trans.endDate, house.endDate);
                            let exists = trips.some(trip => 
                                this.doDatesOverlap(startdate, enddate, trip.startDate, trip.endDate) ||
                                trip.location === guidee.location
                            );
                            if (!exists) {
                                console.log("trip added")                            
                                let price = (trans.price + guidee.price + house.price) * (enddate - startdate)/ (1000 * 60 * 60 * 24);
                                let spots = this.ending(guidee.spots, trans.spots, house.spots);
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
                                this.addPlannedTrip(tripData,trans ,house,guidee);
                                this.removeData(this.guidesFile, guides.indexOf(guidee));
                                this.removeData(this.housesFile, houses.indexOf(house));
                                this.removeData(this.transportFile, transport.indexOf(trans));
                            }
                        }
                    }
                }
            }
        }
    }
}



process.env.NODE_OPTIONS = "--openssl-legacy-provider";
tripPlanner = new TripPlanner(process.argv[12])
if(process.argv[2] == "house") 
     tripPlanner.addHousing(
    parseInt(process.argv[3],10),
    process.argv[4],
    parseInt(process.argv[5],10),
    parseInt(process.argv[6],10),
    parseInt(process.argv[7],10),
    parseInt(process.argv[8],10),
    process.argv[9],
    process.argv[10],
)

if(process.argv[2] == "guide")
     tripPlanner.addGuiding(
        parseInt(process.argv[3],10),
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
        parseInt(process.argv[3],10),
        process.argv[4],
        parseInt(process.argv[5],10),
        parseInt(process.argv[6],10),
        parseInt(process.argv[7],10),
        parseInt(process.argv[8],10),
        process.argv[9],
        process.argv[10],
    )