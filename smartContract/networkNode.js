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
const { performance } = require('perf_hooks');
const os = require('os');

const numLogicalCores = os.cpus().length;

const consensusManager = new consensus();
global.registrationNode = null
const reputationManager = new Reputation();
defaultReputation = 10 ;   
let vote_first_round = [];    
let leaders = [];     
let first_round_validators = [] 
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

        reputationManager.setCurrentNodeUrl(nodeUrl)
        const repus = reputationManager.getNodeReputations()
        const nodeIndex = repus.findIndex(nodeRep => nodeRep.nodeUrl === nodeUrl);
        if (nodeIndex == -1) {
             reputationManager.updateNodeReputation(nodeUrl, defaultReputation, roles);
        }
        console.log("reputation : "+reputationManager.currentNodeReput())
        console.log("registering through api . . .") 
        informAPI().then((result) => {
        if(result.dataNode) 
        { 
            console.log("getting pervious data. . . ")
            global.registrationNode = result.dataNode.split(':')[2]
            register(global.registrationNode)
        }
    })

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

    const startWallTime = performance.now();
    const startCPUUsage = process.cpuUsage();


    
    const hostData = req.body.hostData;
    const {paymentResults , trips,allIds} = await tripChain.verifySmartContracts(tripChain.files,tripChain.currentNodeUrl)
    reputationManager.increaseNodeReputation(nodeUrl);


    await broadcastResults({trips})

    const endWallTime = performance.now();
    const endCPUUsage = process.cpuUsage(startCPUUsage);


    const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
    const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
    const wallTimeMilliseconds = endWallTime - startWallTime;
    const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;
    console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
    console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);


    res.json({paymentResults,allIds,tests : {adjustedCPUPercentage,cpuTimeMilliseconds}});

}); 
  
      
app.post('/getMinedBlocks', async function (req, res){
    console.log("received new blocks")
    const data = req.body;   
    let leader =""     
    if(data.trip ){ 
        leader = await tripChain.verifyleader(tripChain.consensusLeaders,data.trip)
        if(!leader)    res.json({note : "block denied leader unrecognized"});
        const node = tripChain.allNodes.find(n => n.url === leader);
        if(!node)   res.json({note : "block denied leader unrecognized"});
        if (await tripChain.isvalidBlock(tripChain.files,data.trip,node.publicKey,true) ){
            await tripChain.updateJsonFile(tripChain.files.trips,data.trip,false)
            if(data.trip.transactions.tripData.participators.length==0){
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
            if(! data.payment) tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1);
        }  
    }         
    if(data.trips){ 
        const startWallTime = performance.now();
        const startCPUUsage = process.cpuUsage();
      
        leader = await tripChain.verifyleader(tripChain.consensusLeaders,data.trips[0])
        const node = tripChain.allNodes.find(n => n.url === leader); 
 
        for (const trip of data.trips) {
            if (leader && await tripChain.isvalidBlock(tripChain.files, trip,node.publicKey, true)) {
                await tripChain.updateJsonFile(tripChain.files.trips, trip, false);
            }  
        }  
        
        reputationManager.increaseNodeReputation(leader);
        tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1); 
        const endWallTime = performance.now();
        const endCPUUsage = process.cpuUsage(startCPUUsage);
    
    
        const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
        const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
        const wallTimeMilliseconds = endWallTime - startWallTime;
        const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;
        console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
        console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);
    
    }     
    if(data.payment){  
        leader = await tripChain.verifyleader(tripChain.consensusLeaders,data.payment)
        const node = tripChain.allNodes.find(n => n.url === leader);
        if(leader && await tripChain.isvalidBlock(tripChain.files,data.payment,node.publicKey,false)){
            await tripChain.updateJsonFile(tripChain.files.payments,data.payment,false)
        }
        reputationManager.increaseNodeReputation(leader);
        tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1);
    }   
    if(data.house){
        updateJsonFile(tripChain.files.houses,data.house,true)
        tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1);
    }  
    if(data.transport){ 
        updateJsonFile(tripChain.files.transport,data.transport,true)
        tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1);
    } 
    if(data.guide){  
        updateJsonFile(tripChain.files.guides,data.guide,true)
        tripChain.consensusLeaders.splice(tripChain.consensusLeaders.indexOf(leader), 1);
    }
 
   
    res.json({note : "received new blocks"});
 
 
})   
 
 

 

app.post('/addService', async function (req, res){
    const serviceData = req.body.serviceData;
    const service = req.body.service;//extractig data from the request
    const result = await tripChain.addService(tripChain.currentNodeUrl,tripChain.files,serviceData,service)
    //calling the method from the blockchain class to handle the request
    if (result.trip) reputationManager.increaseNodeReputation(nodeUrl);//increase reputation in case of a mined 
    //trip block ...
    await broadcastResults(result)//bradcating to all the network to keep it up to date
    if(result.trip){
        return res.json(
            {
                status: 1,
                message : "new trip generated",
                trip : result.trip
            }
        );
    }//generating a reply for API and the user interface interactions
    return res.json(
        {
            status: 2,
            message : "service has been added", 
        } 
    ); 
}); 

  
app.post('/cancelTrip', async function (req, res){
    const tripId = req.body.tripId 
    const result = await tripChain.cancelTrip(tripId,tripChain.files,tripChain.currentNodeUrl)
    await broadcastResults(result)
    return res.json({
        tripData : result.tripData ,
        participators : result.participators
    
    });
})
 
 
 
  











  
app.post('/addParticipation',async function (req, res){
    console.log("adding parrticipators")
    const { participationData } = req.body;
    const result = await tripChain.addParticipation(tripChain.files,participationData,tripChain.currentNodeUrl);
    reputationManager.increaseNodeReputation(nodeUrl);
    await broadcastResults(result)
    if(result.status = -1) {
        return res.json(result);
    }
    return res.json({
            status: 1,
            message: "Participation added successfully",
        });
});


app.post('/register-and-broadcast', async function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const roles = req.body.roles;
    const publicKey = req.body.publicKey;
    const a = tripChain.allNodes.indexOf(newNodeUrl) === -1;
    const b = newNodeUrl !== nodeUrl;

    if (a && b) {
        tripChain.networkNodes.push({
            url: newNodeUrl,
            roles,
            publicKey
        });
        tripChain.allNodes.push({
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
                allNodes : [
                    ...tripChain.allNodes,
                    {
                        url: nodeUrl,
                        roles,
                        publicKey: tripChain.publicKey
                    }
                ]
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
    const a = tripChain.allNodes.indexOf(newNodeUrl)==-1;
    const b = newNodeUrl !== nodeUrl;
    if (a && b) {
        tripChain.networkNodes.push({
        url :newNodeUrl,
        roles,
        publicKey
    });
    tripChain.allNodes.push({
        url :newNodeUrl,
        roles,
        publicKey
    }); 
}
    reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);
    res.json({
        note : "node registered successfully"
    });
 
 });


 
 app.post('/register-bulk', async function (req, res) {
     try {
         const allNetworkNodes = req.body.allNetworkNodes;
         const allNodes = req.body.allNodes;
 
         allNetworkNodes.forEach(networkNodeUrl => {
             const a = tripChain.networkNodes.find(n => n.url === networkNodeUrl.url) === undefined;
             const b = networkNodeUrl.url !== nodeUrl;
             if (a && b) tripChain.networkNodes.push(networkNodeUrl);
         });
 
         allNodes.forEach(networkNodeUrl => {
             const a = tripChain.allNodes.find(n => n.url === networkNodeUrl.url) === undefined;
             const b = networkNodeUrl.url !== nodeUrl;
             if (a && b) tripChain.allNodes.push(networkNodeUrl);
             reputationManager.updateNodeReputation(networkNodeUrl.url, defaultReputation, roles);
         });
 
         const startWallTime = performance.now();
         const startCPUUsage = process.cpuUsage();
 
         await streamAndSaveFiles(
             global.registrationNode, 
             [
                 { path: '/streamTrips', filePath: tripChain.files.trips },
                 { path: '/streamGuides', filePath: tripChain.files.guides },
                 { path: '/streamTransports', filePath: tripChain.files.transport },
                 { path: '/streamHosts', filePath: tripChain.files.houses },
                 { path: '/streamPayments', filePath: tripChain.files.payments }
             ]
         );
 
         await tripChain.verifyChains(tripChain.files, tripChain.allNodes);
 
         const endWallTime = performance.now();
         const endCPUUsage = process.cpuUsage(startCPUUsage);
         const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
         const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
         const wallTimeMilliseconds = endWallTime - startWallTime;
         const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;
 
         console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
         console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);
 
         res.json({
             note: "Bulk registration successful"
         });
 
     } catch (error) {
         console.error("Error in /register-bulk:", error);
         res.status(500).json({ error: "Failed during bulk registration process" });
     }
 });
 


function register(address){
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



 function informAPI(){
    const url = 'http://localhost:3000/registerNode'
    const newNode = { //sending the new node credintials
        url: nodeUrl,
        publicKey : tripChain.publicKey
    }  
    const registerOption ={
        uri : url, 
        method : 'POST',
        body : {
            newNode 
        },
        json : true
   };
    return rp(registerOption).then((result) => {
        return result
    });

}
 
 
   

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////









app.post('/reset-consensus', function(req, res) {
    const startWallTime = performance.now();
    const startCPUUsage = process.cpuUsage();

    if(tripChain.networkNodes.length === 0) {
        console.log("no node to do consensus")
        return res.json({ leader  : tripChain.currentNodeUrl});
    }


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
            console.log("first step is done . . .")
            const selectTopValidatorsPromises = allNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/vote-first-Round',
                    method: 'GET',
                    json: true,
                });
            });
            return Promise.all(selectTopValidatorsPromises);
        })
        .then(() => {
            console.log("first round vote is done . . .")
            //vote_first_round = responses.map(response => response.topValidators);

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

            if(secondRoundLeaders.length == 0){
                console.log("first round result")

                const endWallTime = performance.now();
                const endCPUUsage = process.cpuUsage(startCPUUsage);
                const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
                const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
                const wallTimeMilliseconds = endWallTime - startWallTime;
                const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;
                console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
                console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);
                        
                return res.json({
                    message : "consensus is over in first round ...",
                    leader : global.leader,
                    leaderList : tripChain.consensusLeaders
                })
            }
            else{

                const leaderPromises = allNodes.map(networkNodeUrl => {
                    return rp({
                        uri: networkNodeUrl.url + '/get-second-vote-leader',
                        method: 'POST',
                        json: true,
                    });
                });
    
                return Promise.all(leaderPromises);
             }
            })
            .then(responses => {
                console.log("socond round result")

                const endWallTime = performance.now();
                const endCPUUsage = process.cpuUsage(startCPUUsage);
                const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
                const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
                const wallTimeMilliseconds = endWallTime - startWallTime;
                const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;
                console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
                console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);
                        



                return res.json({
                    leader : global.leader,
                    message : "leader of second round ",

            })    
        

                })
    })






//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////












app.get('/create-consensus-group', async function(req, res) {
    consensusManager.validators = [];
    vote_first_round = [];
    global.leader = null;
    leaders = [];
    validatorsList = [];
    secondRoundLeaders = [];

    const allNodesReputation = reputationManager.getNodeReputations();

    const allNodes = [...tripChain.networkNodes, {
        url: tripChain.currentNodeUrl,
        role: roles,
        publicKey: tripChain.publicKey
    }];

    consensusManager.validators = consensusManager.getConsensusGroup(allNodesReputation);


    try {
        const broadcastPromises = allNodes.map(async (networkNodeUrl) => {
            await randomDelay(); // Random delay before each request
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

        await Promise.all(broadcastPromises);

        res.json({
            message: "Consensus group created and broadcasted successfully.",
        });

    } catch (error) {
        console.error('Error broadcasting validators', error);
        res.status(500).json({ error: "Failed to broadcast validators" });
    }
});




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.post('/receive-validators', function(req, res) {
    const { validators } = req.body;
    vote_first_round.push(validators);
    res.status(200).json({ message: 'Validators received and stored.' });
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.get('/vote-first-Round', function(req, res) {
    
   const nodeCounts = vote_first_round.flat().reduce((acc, validator) => {
       const nodeUrl = validator.nodeUrl;
       const weight = validator.weight; 
       const reputationScore = validator.reputationScore;
       if (nodeUrl) {
           if (!acc[nodeUrl]) {
               acc[nodeUrl] = { count: 0, weight ,reputationScore};
           }
           else {
               acc[nodeUrl].count++; 
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


   //first_round_validators.push(topTwoNodes);

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

       res.json({ note: 'All top two nodes broadcasted successfully.'});
   })
   .catch(error => {
       res.status(500).json({ error: 'Error broadcasting top two nodes.'});
   });
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.post('/receive-top-two-nodes', function(req, res) {
    const { topTwoNodes } = req.body;
    first_round_validators.push(topTwoNodes);
    res.status(200).json({ message: 'Top two nodes received and processed successfully.' });
});




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



// Leader broadcasting function
app.get('/leader', async function(req, res) {
    if (!first_round_validators || first_round_validators.length === 0) {
        return res.status(404).json({ error: "Top two nodes not available." });
    }

    const flatValidators = first_round_validators.flat();
    const sortedValidators = flatValidators.sort((a, b) => b.weight - a.weight);

    // If the top two nodes have equal weight
    if (sortedValidators.length > 1 && sortedValidators[0].weight === sortedValidators[1].weight) {
        const allNodes = [...tripChain.networkNodes, {
            url: tripChain.currentNodeUrl,
            role: roles,
            publicKey: tripChain.publicKey
        }];
        
        const randomIndex = Math.random() < 0.5 ? 0 : 1;
        global.leader = sortedValidators[randomIndex];

        // Broadcasting to all nodes with random delay
        try {
            const broadcastPromises = allNodes.map(async (networkNodeUrl) => {
                // Random delay between 100ms and 500ms
                await randomDelay();
                
                // Sending the leader info to each node
                return rp({
                    uri: networkNodeUrl.url + '/receive-second-round-leaders',
                    method: 'POST',
                    body: { leader: global.leader },
                    json: true
                });
            });

            // Wait until all requests finish
            await Promise.all(broadcastPromises);
            
            return res.json({
                message: "Leader broadcasted successfully.",
                leader: global.leader
            });

        } catch (error) {
            console.error('Error broadcasting leader', error);
            res.status(500).json({ error: "Failed to broadcast leader from node " + tripChain.currentNodeUrl });
        }

    } else {
        // If the top two nodes do not have equal weight, use the first one
        global.leader = sortedValidators[0].addressnodeUrl;
        tripChain.consensusLeaders.push(sortedValidators[0].nodeUrl);
        
        return res.json({
            message: "Leader selected and broadcasted successfully.",
            leader: global.leader,
        });
    }
});
    
    
    
 //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   


app.post('/receive-second-round-leaders', function(req, res) {

    const { leader } = req.body;
    secondRoundLeaders.push(leader);
    res.status(200).json({ message: 'Top two nodes received and processed successfully.' });

})


 //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
   


app.post('/get-second-vote-leader', function(req, res) {

    const urlCountMap = {};

    secondRoundLeaders.forEach(item => {
    urlCountMap[item.nodeUrl] = (urlCountMap[item.nodeUrl] || 0) + 1;
    });
    const countedUrls = Object.entries(urlCountMap)
    .map(([nodeUrl, count]) => ({ nodeUrl, count }));
    const sortedUrls = countedUrls.sort((a, b) => b.count - a.count);
    global.leader =sortedUrls[0].nodeUrl
    if(sortedUrls.lenght >1 && sortedUrls[0].count == sortedUrls[1].count && sortedUrls[1]>sortedUrls[0]){
        global.leader =sortedUrls[1].nodeUrl
    }
    tripChain.consensusLeaders.push(global.leader) 

    res.status(200).json({ message: 'leader picked .' });

})









    
 
    
    
    
    
    
    
    
    
    
    
    
    
    
    















































































































//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.get('/streamTrips', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked'); 

    const readStream = fs.createReadStream(tripChain.files.trips, { encoding: 'utf8' });//creating a stream of the trips file
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


app.get('/leaders',async(req,res) =>{
    res.json(tripChain.consensusLeaders)
})


 



app.get('/getService', async (req, res) => {

    const settings = req.body;
    console.log("settings ")
    console.log(settings)
    const result = await tripChain.getService(settings,tripChain.files)
    res.json(result)
})
 
  
app.get('/getTrips', async (req, res) => {
    const result = await tripChain.pullValidTrips(tripChain.files,true)
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
        return instance;
    } catch (err) {
        console.error("Failed to create genesis blocks:", err);
        throw err;
    }
};









function randomDelay() {
    let minMs = 0;
    let maxMs = 2000;
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, ms));
}