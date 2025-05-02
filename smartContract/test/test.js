const rp = require('request-promise');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});   

// Function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendRequests() {
    let registerOption;

    // Send requests with a delay between them
    registerOption = {
        uri: 'http://localhost:3000/addService',
        method: 'POST',
        body: {
            service : "house",
            serviceData: {
                id: "765",
                location: "oran",
                startDate: 1745037667000,
                endDate: 1746901667000,
                price: 4,
                spots: 7,
                bankUrl: "bankkofhost",
                description : "testttt"
            }
        },
        json: true
    };
    await rp(registerOption);
    console.log("Sent addHost request");
    await delay(1000); // Wait 1 second

    registerOption.body.service = 'transport';
    
    await rp(registerOption);
    console.log("Sent addTransport request");
    await delay(1000);

    registerOption.body.service = 'guide';
    await rp(registerOption);
    console.log("Sent addGuide request");
    await delay(1000);

    rl.question('trip id: ', async (id) => {
        registerOption = {
            uri: 'http://localhost:3001/participate',
            method: 'POST',
            body: {
                participationData: {
                    tripId: id,
                    participator: "participationId2",
                    amount: 10000,
                    spots : 2
                }
            },
            json: true
        };
        await rp(registerOption);
        console.log("Sent first addParticipation request");
        await delay(1000);

        await rp(registerOption);
        console.log("Sent second addParticipation request");



        await delay(1000);
        registerOption = {
            uri: 'http://localhost:3000/verify',
            method: 'POST',
            body: {
            },
            json: true
        };
        await rp(registerOption);
        console.log("verified");





        rl.close();
    });
}

await sendRequests();
await verify()
