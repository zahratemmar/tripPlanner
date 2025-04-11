const express = require('express');
const { createGenesisBlocks } = require("./blockchain/genesis");
const http = require('http');
const fs = require('fs');
const Blockchain = require('./blockchain/blockchain'); 
const bodyParser = require('body-parser');
const { url } = require('inspector');
const rp = require('request-promise'); 
const Reputation = require('./Reputation');
const consensus = require('./consensus');
const { updateJsonFile } = require('./blockchain/utils');
const consensusManager = new consensus();
global.registrationNode = null
const reputationManager = new Reputation();
defaultReputation = 10 ;   
let vote_first_round = [];    
let leaders = [];     
let first_round_validators = [] 
global.finalLeader = 
    [
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001",
        "http://localhost:3001"
    ];  
const roles = "nromal";   
const port = process.argv[2];  
const nodeUrl="http://localhost:"+port
global.leader = null;
const app = express();   
app.use(bodyParser.json());   
app.use(express.json());  
app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});
let tripChain

createBlockchain(nodeUrl, port)
    .then(tc => {
        tripChain=tc
        console.log("hello")   
        reputationManager.setCurrentNodeUrl(nodeUrl)
        reputationManager.updateNodeReputation(nodeUrl, defaultReputation, roles);
        console.log("reputation : "+reputationManager.currentNodeReput())
        console.log("right after")
        console.log("keyyy  : ")
        console.log(tripChain.publicKey)    

        if(process.argv[3]) 
        {
            global.registrationNode = process.argv[3]
            register(global.registrationNode)
        }
 

    })
    .catch(err => {
        console.error("Error initializing tripChain:", err);
    });




 

app.get('/reputation',function(req,res){
    res.json(reputationManager.getNodeReputations())
})
 
 
app.get('/blockchain', function (req, res){
    res.send(tripChain);
});


app.get('/trips', async function (req, res){
    const trips = await tripChain.pullValidTrips(true);  
    res.send(trips);
});
 
 
app.post('/verifySmartContracts', async function (req, res){
    const hostData = req.body.hostData;
    const {paymentResults , trips} = await tripChain.verifySmartContracts(tripChain.files,tripChain.currentNodeUrl)
    console.log(paymentResults) 
    reputationManager.increaseNodeReputation(nodeUrl);
    await broadcastResults({trips})
    res.json(paymentResults);
}); 
  
      
app.post('/getMinedBlocks', async function (req, res){
    console.log("received new blocks")
    const data = req.body;   
    let leader =""     
    if(data.trip ){   
        leader = await tripChain.verifyleader(global.finalLeader,data.trip)
        const node = tripChain.networkNodes.find(n => n.url === leader);
        console.log("node : "+node.url)
        if (leader && await tripChain.isvalidBlock(tripChain.files,data.trip,node.publicKey,true) ){
            await tripChain.updateJsonFile(tripChain.files.trips,data.trip,false)
            console.log("length = "+ data.trip.transactions.tripData.participators.length)
            if(data.trip.transactions.tripData.participators.length==0){
                console.log("deletion started")
                const tripdata = data.trip.transactions
                await tripChain.deleteUsedServices(
                [
                    {file : tripChain.files.guides ,id : tripdata.guideData.id },
                    {file : tripChain.files.houses ,id :tripdata.houseData.id },
                    {file : tripChain.files.transport ,id : tripdata.transportData.id }
                ]                
                )
            }
            reputationManager.increaseNodeReputation(leader);
            if(! data.payment) global.finalLeader.splice(global.finalLeader.indexOf(leader), 1);
        }  
    }         
    if(data.trips){   
        leader = await tripChain.verifyleader(global.finalLeader,data.trips[0])
        const node = tripChain.networkNodes.find(n => n.url === leader); 
 
        for (const trip of data.trips) {
            if (leader && await tripChain.isvalidBlock(tripChain.files, trip,node.publicKey, true)) {
                await tripChain.updateJsonFile(tripChain.files.trips, trip, false);
            }  
        }  
        
        reputationManager.increaseNodeReputation(leader);
        global.finalLeader.splice(global.finalLeader.indexOf(leader), 1); 
    }     
    if(data.payment){  
        leader = await tripChain.verifyleader(global.finalLeader,data.payment)
        const node = tripChain.networkNodes.find(n => n.url === leader);
        console.log("node : "+node.url)
        if(leader && await tripChain.isvalidBlock(tripChain.files,data.payment,node.publicKey,false)){
            await tripChain.updateJsonFile(tripChain.files.payments,data.payment,false)
        }
        reputationManager.increaseNodeReputation(leader);
        global.finalLeader.splice(global.finalLeader.indexOf(leader), 1);
    }   
    if(data.house){
        updateJsonFile(tripChain.files.houses,data.house,true)
        global.finalLeader.splice(global.finalLeader.indexOf(leader), 1);
    }  
    if(data.transport){ 
        updateJsonFile(tripChain.files.transport,data.transport,true)
        global.finalLeader.splice(global.finalLeader.indexOf(leader), 1);
    } 
    if(data.guide){  
        updateJsonFile(tripChain.files.guides,data.guide,true)
        global.finalLeader.splice(global.finalLeader.indexOf(leader), 1);
    }
 
   
    res.json({note : "received new blocks"});
 
 
})   
 
 

 

app.post('/addHost', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(tripChain.currentNodeUrl,tripChain.files,hostData,"house")
    if (result.trip) reputationManager.increaseNodeReputation(nodeUrl);

    await broadcastResults(result)
    res.json(
        {
            note: "House added successfully",
        }
    );
}); 

  
app.post('/addGuide', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(tripChain.currentNodeUrl,tripChain.files,hostData,"guide")
    if (result.trip) reputationManager.increaseNodeReputation(nodeUrl);
    await broadcastResults(result)
    res.json( 
        {
            note: "guide added successfully",
        } 
    );
}); 

app.post('/addTransport', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(tripChain.currentNodeUrl,tripChain.files,hostData,"transport")
    if (result.trip) reputationManager.increaseNodeReputation(nodeUrl);
    await broadcastResults(result)
    res.json(
        {
            note: "trnsport added successfully",
        }
    );
}); 
 

app.post('/addParticipation',async function (req, res){
    console.log("adding parrticipators")
    const { participationData } = req.body;
    const result = await tripChain.addParticipation(tripChain.files,participationData,tripChain.currentNodeUrl);
    reputationManager.increaseNodeReputation(nodeUrl);
    await broadcastResults(result)
    res.json({
            note: "Participation added successfully",
        });
});


app.post('/register-and-broadcast', async function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const roles = req.body.roles;
    const publicKey = req.body.publicKey;
    console.log("keyyy  : ")
    console.log(publicKey)
    const a = tripChain.networkNodes.indexOf(newNodeUrl) === -1;
    const b = newNodeUrl !== nodeUrl;

    if (a && b) {
        tripChain.networkNodes.push({
            url: newNodeUrl,
            roles,
            publicKey
        });
    }

    reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);

    const regNodesPromises = [];
    tripChain.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode.url + '/register',
            method: 'POST',
            body: {
                newNodeUrl,
                roles,
                publicKey
            },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
 
    console.log("new node " + newNodeUrl + " registered through this node");

    try {
        await Promise.all(regNodesPromises);
        //const allServices = await tripChain.getAllServices();
        const bulkRegisterOption = {
            uri: newNodeUrl + '/register-bulk',
            method: 'POST',
            body: {
                allNetworkNodes: [
                    ...tripChain.networkNodes,
                    {
                        url: nodeUrl,
                        roles,
                        publicKey: tripChain.publicKey
                    }
                ],
            },
            json: true
        };
        await rp(bulkRegisterOption);









        res.json({
            note: "node registered successfully"
        });

        console.log("sent all nodes");

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: "An error occurred while registering the node." });
    }
});


app.post('/register', function (req, res) {
    console.log('registering');
    const newNodeUrl=req.body.newNodeUrl;
    const  roles  = req.body.roles;
    const publicKey=req.body.publicKey;
    const a = tripChain.networkNodes.indexOf(newNodeUrl)==-1;
    const b = newNodeUrl !== nodeUrl;
    if (a && b) tripChain.networkNodes.push({
        url :newNodeUrl,
        roles,
        publicKey
    });
    reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);
    res.json({
        note : "node registered successfully"
    });

 });


 app.post('/register-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    console.log(tripChain.url);
    allNetworkNodes.forEach(networkNodeUrl =>{
        console.log(networkNodeUrl);
        const a = tripChain.networkNodes.indexOf(networkNodeUrl.url)==-1;
        const b = networkNodeUrl.url !== nodeUrl;  
        if(a && b) tripChain.networkNodes.push(networkNodeUrl);
        reputationManager.updateNodeReputation(networkNodeUrl.url, defaultReputation, roles);
    }); 
 
    streamAndSaveFiles(
        global.registrationNode,
        [ 
            { path: '/streamTrips', filePath: tripChain.files.trips },
            { path: '/streamGuides', filePath: tripChain.files.guides },
            { path: '/streamTransports', filePath: tripChain.files.transport }, 
            { path: '/streamHosts', filePath: tripChain.files.houses },
            { path: '/streamPayments', filePath: tripChain.files.payments }
        ]  
    ).then(results => {  
        tripChain.verifyChains(tripChain.files,tripChain.networkNodes)
        res.json({  
            note : "bulk registeration successful"
        }); 
    }) 
    .catch(error => {
        console.error("Error saving files:", error);
    });








    
});
 



function register(address){
    console.log("key to register ")
    console.log(tripChain.publicKey)
    const url = 'http://localhost:'+address+'/register-and-broadcast'
    const registerOption ={
        uri : url,
        method : 'POST',
        body : {
            newNodeUrl: nodeUrl,
            roles,
            publicKey : tripChain.publicKey
        },
        json : true
   };
   return rp(registerOption);

}


app.post('/reset-consensus', function(req, res) {

    consensusManager.validators = [];
    vote_first_round = [];
    global.leader = null;
    leaders = [];
    validatorsList = [];
    finalLeader = null;
    const allNodes = [...tripChain.networkNodes, {
        url : tripChain.currentNodeUrl,
        role: roles,
        publicKey : tripChain.publicKey
    }]

    const createConsensusPromises = allNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/create-consensus-group',
            method: 'GET',
            json: true,
        });
    }); 

    Promise.all(createConsensusPromises)
        .then(() => {
            const selectTopValidatorsPromises = allNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/vote-first-Round',
                    method: 'GET',
                    json: true,
                });
            });

            return Promise.all(selectTopValidatorsPromises);
        })
        .then(responses => {
            vote_first_round = responses.map(response => response.topValidators);
            const potentialLeaderPromises = allNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/leader',
                    method: 'GET',
                    json: true,
                });
            });

            return Promise.all(potentialLeaderPromises);
        })
        .then(responses => {
            global.leader = responses.map(response => response.leader);
            const announceFinalLeaderPromises = allNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/receive-leader-and-vote-final-leader',
                    method: 'POST',
                    body : {leader :global.leader },
                    json: true,
                });
            });

            return Promise.all(announceFinalLeaderPromises);
        })
        .then(responses => {
            finalLeader = responses.map(response => response.finalLeader);
            res.status(200).json({
                message: "Consensus group created, broadcasted successfully, top validators selected, potential leader chosen, and final leader announced.",
                vote_first_round:  vote_first_round,
                leader: global.leader,
            });
        })
        .catch(error => {
            console.error("Error in process:",error); 
            res.status(500).json({ message: "Error in resetting consensus, selecting top validators, choosing potential leader, and announcing final leader." });
        });
});



app.get('/create-consensus-group', function(req, res) {
    const startExecution = performance.now();
    const startCPUUsage = process.cpuUsage();

    if (tripChain.networkNodes.length === 0) { 
        return res.status(404).json({ error: "No nodes registered in the network." });
    }
    
    const allNodesReputation = reputationManager.getNodeReputations();
    const allNodes = [...tripChain.networkNodes, {
        url : tripChain.currentNodeUrl,
        role: roles,
        publicKey : tripChain.publicKey
    }]
    consensusManager.validators = consensusManager.getConsensusGroup(allNodesReputation);
    vote_first_round.push(consensusManager.validators);
    const broadcastPromises = allNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/receive-validators',
            method: 'POST',
            body: { 
                validators: consensusManager.validators.map(validator => ({
                    nodeUrl: validator.nodeUrl,
                    reputationScore: validator.reputationScore,
                    role: validator.role,
                    weight: validator.weight,
                })),
            },
            json: true,
        });
    });

    Promise.all(broadcastPromises)
    .then(data => {
        const endExecution = performance.now();
        const endCPUUsage = process.cpuUsage(startCPUUsage);
        const executionTime = endExecution - startExecution;
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        res.json({
            message: "Consensus group created and broadcasted successfully.",
            validators: consensusManager.validators,
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms",
        });
    })
    .catch(error => {
        console.error('Error broadcasting validators', error);
        res.status(500).json({ error: "Failed to broadcast validators" });
    });
});

app.post('/receive-validators', function(req, res) {
    const { validators } = req.body;
    vote_first_round.push(validators);
    res.status(200).json({ message: 'Validators received and stored.' });
});

app.get('/vote-first-Round', function(req, res) {
     const startExecution = performance.now();
     const startCPUUsage = process.cpuUsage();
    const nodeCounts = vote_first_round.flat().reduce((acc, validator) => {
        const nodeUrl = validator.nodeUrl;
        const weight = validator.weight; 
        const reputationScore = validator.reputationScore;
        if (nodeUrl) {
            if (!acc[nodeUrl]) {
                acc[nodeUrl] = { count: 0, weight ,reputationScore};
            }
            else {
                acc[nodeUrl].count++; // Increment count on subsequent occurrences
            }
        }
        
        return acc;
    }, {});
    const sortedNodes = Object.keys(nodeCounts).sort((a, b) => {
        if (nodeCounts[b].count === nodeCounts[a].count) {
            return nodeCounts[b].weight - nodeCounts[a].weight;
        } else {
            return nodeCounts[b].count - nodeCounts[a].count;
        }
    });
    const topTwoNodes = sortedNodes.slice(0, 2).map(node => ({
        nodeUrl: node,
        count: nodeCounts[node].count,
        weight: nodeCounts[node].weight,
        reputationScore: nodeCounts[node].reputationScore,
    }));
    first_round_validators.push(topTwoNodes);
    const allNodes = [...tripChain.networkNodes, {
        url : tripChain.currentNodeUrl,
        role: roles,
        publicKey : tripChain.publicKey
    }]
    const broadcastPromises = allNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/receive-top-two-nodes',
            method: 'POST',
            body: { topTwoNodes }, 
            json: true,
        });
    });
    Promise.all(broadcastPromises)
    .then(responses => {
        const endExecution = performance.now();
        const endCPUUsage = process.cpuUsage(startCPUUsage);
        const executionTime = endExecution - startExecution;
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;

        res.json({ note: 'All top two nodes broadcasted successfully.',
            executionTime: executionTime + ' ms',
            cpuUsage: cpuUsage + ' ms', 
        });
    })
    .catch(error => {
        const endExecution = performance.now();
        const endCPUUsage = process.cpuUsage(startCPUUsage);
        const executionTime = endExecution - startExecution;
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        res.status(500).json({ error: 'Error broadcasting top two nodes.',
        executionTime: executionTime + ' ms',
        cpuUsage: cpuUsage + ' ms',
         });
    });
});

app.post('/receive-top-two-nodes', function(req, res) {
    const { topTwoNodes } = req.body;
    first_round_validators.push(topTwoNodes);
    res.status(200).json({ message: 'Top two nodes received and processed successfully.' });
});

app.get('/leader', function(req, res){
    if (!first_round_validators || first_round_validators.length === 0) {
        return res.status(404).json({ error: "Top two nodes not available." });
    }
    const startExecution = performance.now();
    const startCPUUsage = process.cpuUsage();
    const flatValidators = first_round_validators.flat();
    const sortedValidators = flatValidators.sort((a, b) => b.weight - a.weight);
    if (sortedValidators.length > 1 && sortedValidators[0].weight === sortedValidators[1].weight) {
    global.leader = sortedValidators[0];
     const allNodes = [...tripChain.networkNodes, {
        url : tripChain.currentNodeUrl,
        role: roles,
        publicKey : tripChain.publicKey
    }]

     const broadcastPromises = allNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/broadcast-leader',
            method: 'POST',
            body: { leader: global.leader },
            json: true,
        });
    });

    Promise.all(broadcastPromises)
        .then(data => {
             const endExecution = performance.now();
             const endCPUUsage = process.cpuUsage(startCPUUsage);
             const executionTime = endExecution - startExecution;
             const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
            res.json({
                message: "Leader selected and broadcasted successfully.",
                leader: global.leader,
                executionTime: executionTime + " ms",
                cpuUsage: cpuUsage + " ms",
            });
        })
        .catch(error => {
            const endExecution = performance.now();
            const endCPUUsage = process.cpuUsage(startCPUUsage);
            const executionTime = endExecution - startExecution;
            const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
            console.error('Error broadcasting leader', error);
            res.status(500).json({ error: "Failed to broadcast leader",
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms"
             });
        });
    }else{
        global.leader = consensusManager.selectLeader(first_round_validators);
        const broadcastPromises = allNodes.map(networkNodeUrl => {
            return rp({
                uri: networkNodeUrl.url + '/receive-leader-and-vote-final-leader',
                method: 'POST',
                body: { leader: global.leader ,
                 },
                json: true,
            });
        });
    
        Promise.all(broadcastPromises)
        .then(data => {
            res.json({
                message: "leader broadcasted succesfully.",
                leader: global.leader
            });
        })
        .catch(error => {
            console.error('Error broadcasting leader', error);
            res.status(500).json({ error: "Failed to broadcast leader" });
        }); 
    }  
});


app.post('/broadcast-leader', function(req, res) {
    const { leader } = req.body;
    res.status(200).json({ message: 'Leader received.', leader: leader });
});


app.post('/receive-leader-and-vote-final-leader', function(req, res) {
     const startExecution = performance.now();
     const startCPUUsage = process.cpuUsage();
    const leader = req.body.leader;
    if (!leader ) {
        return res.status(400).json({ message: 'Invalid leader data received.' });
    }
    leaders=leader.map(ld => ld.nodeUrl);
    if (leaders.length === 0) {
        return res.status(404).json({ error: "No leader data available." });
    }
    const leaderCounts = leaders.reduce((acc, leader) => {
        acc[leader] = (acc[leader] || 0) + 1;
        return acc;
    }, {});
    const finalLeader = Object.entries(leaderCounts).reduce((max, [url, count]) => {
        return count > max.count ? { url, count } : max;
    }, { url: "", count: 0 });
    global.leader = finalLeader.url;
    global.finalLeader.push(finalLeader.url)
    if (!leader || leader.reputationScore === -1) {
         const endExecution = performance.now();
         const endCPUUsage = process.cpuUsage(startCPUUsage);
         const executionTime = endExecution - startExecution;
         const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        return res.status(404).json({ error: "No valid leader found." ,
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms"
        });
    }
      const endExecution = performance.now();
      const endCPUUsage = process.cpuUsage(startCPUUsage);
      const executionTime = endExecution - startExecution;
      const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
    res.status(200).json({ message: 'Leader received.', leader: leader ,
        executionTime: executionTime + " ms",
        cpuUsage: cpuUsage + " ms"
    });
});








app.get('/streamTrips', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.trips, { encoding: 'utf8' });

    readStream.on('data', (chunk) => {
        res.write(chunk); // Send JSON chunk
    });

    readStream.on('end', () => {
        res.end(); // End the response when the file is fully sent
    });

    readStream.on('error', (err) => {
        console.error('Error reading file:', err);
        res.status(500).end(JSON.stringify({ error: 'File read error' }));
    });
});


app.get('/streamGuides', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.guides, { encoding: 'utf8' });

    readStream.on('data', (chunk) => {
        res.write(chunk); // Send JSON chunk
    });

    readStream.on('end', () => {
        res.end(); // End the response when the file is fully sent
    });

    readStream.on('error', (err) => {
        console.error('Error reading file:', err);
        res.status(500).end(JSON.stringify({ error: 'File read error' }));
    });
});


app.get('/streamTransports', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.transport, { encoding: 'utf8' });

    readStream.on('data', (chunk) => {
        res.write(chunk); // Send JSON chunk
    });

    readStream.on('end', () => {
        res.end(); // End the response when the file is fully sent
    });

    readStream.on('error', (err) => {
        console.error('Error reading file:', err);
        res.status(500).end(JSON.stringify({ error: 'File read error' }));
    });
});


app.get('/streamHosts', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.houses, { encoding: 'utf8' });

    readStream.on('data', (chunk) => {
        res.write(chunk); // Send JSON chunk
    });

    readStream.on('end', () => {
        res.end(); // End the response when the file is fully sent
    });

    readStream.on('error', (err) => {
        console.error('Error reading file:', err);
        res.status(500).end(JSON.stringify({ error: 'File read error' }));
    });
});


app.get('/streamPayments', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.payments, { encoding: 'utf8' });

    readStream.on('data', (chunk) => {
        res.write(chunk); // Send JSON chunk
    });

    readStream.on('end', () => {
        res.end(); // End the response when the file is fully sent
    });

    readStream.on('error', (err) => {
        console.error('Error reading file:', err);
        res.status(500).end(JSON.stringify({ error: 'File read error' }));
    });
});









app.get('/getService', (req, res) => {

    const settings = req.body;
    const result = tripChain.getService(settings)
    res.json(result)


})















broadcastResults = async function(results){
    console.log("broadcasting the results")
    const regNodesPromises = [];
    tripChain.networkNodes.forEach(networkNode => {
        const requestOptions = {
            uri: networkNode.url + '/getMinedBlocks',
            method: 'POST',
            body: results,
            json: true 
        };  
        regNodesPromises.push(rp(requestOptions));
    });   
    
    try {
        await Promise.all(regNodesPromises);
    }
    catch (error) {
        console.error("Error during broadcasting new blocks:", error);
    }

}









function streamAndSaveFiles(port,files) {
    const requests = files.map(({ path, filePath }) => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: path,
                method: 'GET',
            };

            let data = "";
            const req = http.request(options, (res) => {
                res.setEncoding('utf8');

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log(`Streaming complete of ${path}`);
                    fs.writeFile(filePath, data, (err) => {
                        if (err) {
                            console.error(`Error writing file:`, err);
                            return reject(`Failed to writefile`);
                        }
                        console.log(`JSON file saved.`);
                        resolve({ message: ` file written successfully` });
                    });
                });
            });

            req.on('error', (err) => {
                console.error(` Error receiving stream:`, err);
                reject(`Failed to receive stream`);
            });

            req.end();
        });
    });

    return Promise.all(requests);
}




 async function createBlockchain(nodeUrl, port) {
    const instance = new Blockchain(nodeUrl, port);
    try {
        instance.publicKey = await createGenesisBlocks(instance.files);
        console.log("created key");
        return instance;
    } catch (err) {
        console.error("Failed to create genesis blocks:", err);
        throw err;
    }
};

