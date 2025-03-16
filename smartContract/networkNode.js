const express = require('express');
const Blockchain = require('./blockchain/blockchain'); 
const bodyParser = require('body-parser');
const { url } = require('inspector');
const rp = require('request-promise'); 
const Reputation = require('./Reputation');
const consensus = require('./consensus');
const consensusManager = new consensus();
  
const reputationManager = new Reputation();
defaultReputation = 10;
let vote_first_round = [];  
let leaders = [];   
let first_round_validators = [] 
global.finalLeader = null;  
const roles = "nromal";  
const port = process.argv[2];  
const nodeUrl="http://localhost:"+port
const tripChain= new Blockchain(nodeUrl);
global.leader = null ;
const app = express();  
app.use(bodyParser.json());   
app.use(express.json());  
   
     
app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});  
console.log("hello")   
reputationManager.setCurrentNodeUrl(nodeUrl)
reputationManager.updateNodeReputation(nodeUrl, defaultReputation, roles);
console.log("reputation : "+reputationManager.currentNodeReput())
if(process.argv[3]) register(process.argv[3])

 
 
 
app.get('/blockchain', function (req, res){
    res.send(tripChain);
});

//to test the pulling
/*
app.get('/trips', async function (req, res){
    const trips = await tripChain.pullValidTrips(true);  
    res.send(trips);
});

*/

app.post('/verifySmartContracts', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.verifySmartContracts()
    console.log(result)
    res.json(result);
}); 



app.post('/addHost', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(hostData,"house")
    res.json(result);
}); 


app.post('/addGuide', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(hostData,"guide")
    res.json(result);
});

app.post('/addTransport', async function (req, res){
    const hostData = req.body.hostData;
    const result = await tripChain.addService(hostData,"transport")
    res.json(result);
}); 


app.post('/addParticipation',async function (req, res){
    console.log("adding parrticipators")
    const { participationData } = req.body;
    const result = await tripChain.addParticipation(participationData);
    res.json(result);
});


app.post('/register-and-broadcast', async function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const roles = req.body.roles;
    const publicKey = req.body.publicKey;
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
                //tripBC: tripChain.getBlockChain(true),
                //paymentBC: tripChain.getBlockChain(false),
                //allServices
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
        console.log(b);  
        if(a && b) tripChain.networkNodes.push(networkNodeUrl);
        reputationManager.updateNodeReputation(networkNodeUrl.url, defaultReputation, roles);
    });

    res.json({
        note : "bulk registeration successful"
    });
   
    


    //to test the consensus
/*    if(allNetworkNodes.length>2){
        console.log("consensus starts")
        for(let i = 0; i < 10; i++) {          
            for(let j = 0; j < 10000000; j++) {
                  j=j+1
                  }
            console.log("waiting");
    }

    const consensus ={
        uri : nodeUrl+'/reset-consensus',
        method : 'POST',
        body : {
        },
        json : true
   };
   return rp(consensus)
   .then(data=>{
    console.log(data)
 });}*/
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
            console.error("Error in process:", error);
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





app.post('/executePayments', function (req, res){

   // tripChain.checkSmartContracts();

 
});

