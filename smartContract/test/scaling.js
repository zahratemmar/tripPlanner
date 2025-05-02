
import rp from 'request-promise';
global.delayTime= 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));



async function sendRequests() {
    let registerOption;
    registerOption = {
        uri: 'http://localhost:3000/signin',
        method: 'POST',
        
    
        body: {
            email : "zahratemmar@gmail.com",
            password : "test"
        },
        json: true
    };
    let data = await rp(registerOption);
    console.log(data)
    const token = data.token


    registerOption = {
        uri: 'http://localhost:3000/profile',
        method: 'GET',
        headers: {
            Authorization: token
        },
        body: {},
        json: true
    };
    data = await rp(registerOption);
    const userId = data.profile.id



    // Send requests with a delay between them
    data = JSON.stringify({
        service : "house",
        serviceData: {
            id: userId,
            location: "oran",
            startDate: 1748037667000,
            endDate: 1749901667000,
            price: 4,
            spots: 7,
            bankUrl: "bankkofhost",
            description : "testttt"
        }
    })
    registerOption = {
        uri: 'http://localhost:3000/addService',
        method: 'POST',
        headers: {
            Authorization: token
        },
        body: {
            data
        },
        json: true
    };

    await rp(registerOption);
    console.log("Sent addHost request");
    await delay(global.delayTime); // Wait 1 second




    data = JSON.stringify({
        service : "transport",
        serviceData: {
            id: userId,
            location: "oran",
            startDate: 1748037667000,
            endDate: 1749901667000,
            price: 4,
            spots: 7,
            bankUrl: "bankkofhost",
            description : "testttt"
        }
    })



    registerOption.body.data = data;
    
    await rp(registerOption);


    
    console.log("Sent addTransport request");
    await delay(global.delayTime);


    data = JSON.stringify({
        service : "guide",
        serviceData: {
            id: userId,
            location: "oran",
            startDate: 1748037667000,
            endDate: 1749901667000,
            price: 4,
            spots: 7,
            bankUrl: "bankkofhost",
            description : "testttt"
        }
    })



    registerOption.body.data = data;
    
    data = await rp(registerOption);
    console.log("data .. ",data)
    const tripId= data.trip.id
    console.log("Sent addGuide request");
    await delay(global.delayTime);

        registerOption = {
            uri: 'http://localhost:3000/participate',
            method: 'POST',
            headers: {
                Authorization: token
            },
            body: {
                tripData: {
                    tripId: tripId,
                    amount: 10000,
                    spots : 1
                }
            },
            json: true
        };
        data = await rp(registerOption);
        console.log("Sent first addParticipation request \n", data );
        await delay(global.delayTime);

        await rp(registerOption);
        console.log("\nSent second addParticipation request\n", data );

        await delay(global.delayTime);

        await rp(registerOption);
        console.log("\nSent thrid addParticipation request\n", data );
        await delay(global.delayTime);

        await rp(registerOption);
        console.log("\nSent fourth addParticipation request\n", data );









 /* */
}

async function verify (){
    
    await delay(1000);
    let registerOption = {
        uri: 'http://localhost:3000/verify',
        method: 'POST',
        body: {
        },
        json: true
    };
    await rp(registerOption);
    console.log("verified");

}

await sendRequests();
await sendRequests();
/*
await sendRequests();
await sendRequests();
await sendRequests();



console.log("\n\n\n\n 1 batch done")



await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();


console.log("\n\n\n\n 2 batches done")


/*

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();

console.log("\n\n\n\n 3 batches done")

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();



console.log("\n\n\n\n 4 batches done")
/*

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();

console.log("\n\n\n\n 5 batches done")

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
console.log("\n\n\n\n 6 batches done")


/*

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();

console.log("\n\n\n\n 7 batches done")

await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
await sendRequests();
console.log("\n\n\n\n 8 batches done")




/*
*/
await verify()