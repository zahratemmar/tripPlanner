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
        uri: 'http://localhost:3001/addHost',
        method: 'POST',
        body: {
            hostData: {
                id: 765,
                location: "oran3",
                startDate: 1742037667000,
                endDate: 1742901667000,
                price: 4,
                spots: 7,
                bankUrl: "bankkofhost"
            }
        },
        json: true
    };
    await rp(registerOption);
    console.log("Sent addHost request");
    await delay(1000); // Wait 1 second

    registerOption.uri = 'http://localhost:3001/addTransport';
    await rp(registerOption);
    console.log("Sent addTransport request");
    await delay(1000);

    registerOption.uri = 'http://localhost:3001/addGuide';
    await rp(registerOption);
    console.log("Sent addGuide request");
    await delay(1000);

    rl.question('trip id: ', async (id) => {
        registerOption = {
            uri: 'http://localhost:3001/addParticipation',
            method: 'POST',
            body: {
                participationData: {
                    tripId: id,
                    participator: "participationId2",
                    amount: 1000
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
            uri: 'http://localhost:3001/verifySmartContracts',
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

sendRequests();
