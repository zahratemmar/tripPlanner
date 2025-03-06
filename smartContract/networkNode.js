const express = require('express');
const Blockchain = require('./blockchain'); 
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

app.post('/addHost', async function (req, res){
    const hostData = req.body.hostData;
    tripChain.addHost(hostData)
}); 


app.post('/register-and-broadcast', function (req, res) {
    const newNodeUrl=req.body.newNodeUrl;
    const  roles  = req.body.roles;
    const publicKey=req.body.publicKey;
    const a = tripChain.networkNodes.indexOf(newNodeUrl)==-1;
    const b = newNodeUrl !== nodeUrl;
    if (a && b )tripChain.networkNodes.push({
        url :newNodeUrl,
        roles,
        publicKey
    });
    reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);


    const regNodesPromises = [];
    tripChain.networkNodes.forEach(networkNode =>{
        const requestOptions ={
             uri : networkNode.url+'/register',
             method : 'POST',
             body : {
                newNodeUrl,
                roles,
                publicKey
            },
             json : true
        };
        regNodesPromises.push(rp(requestOptions)); 
    });
    console.log("new node "+ newNodeUrl +"registered through this node")
    Promise.all(regNodesPromises)
    .then(data =>{
        const bulkRegisterOption ={
            uri : newNodeUrl+'/register-bulk',
            method : 'POST',
            body : {allNetworkNodes : [ ... tripChain.networkNodes , {
                url : nodeUrl,
                roles,
                publicKey:tripChain.publicKey
            }]},
            json : true
       };
       return rp(bulkRegisterOption);
    })
    .then(data=>{
        res.json({
            note : "node registered successfully"});
    });
    console.log("sent all nodes")

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
    });

    res.json({
        note : "bulk registeration successful"
    });
   
    


    //to test the consensus
    if(allNetworkNodes.length>2){
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
        res.json({
            note : "consensus starts"
        });
    console.log("consensus axios sent")
 });}
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
    // Reset consensus variables
    consensusManager.validators = [];
    vote_first_round = [];
    global.leader = null;
    leaders = [];
    validatorsList = [];
    finalLeader = null;
    // Prepare promises to call '/create-consensus-group' on each network node
    const createConsensusPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/create-consensus-group',
            method: 'GET',
            json: true,
        });
    }); 

    // Execute all create consensus group requests
    Promise.all(createConsensusPromises)
        .then(() => {
            // Prepare promises to call '/select-top-validators' on each network node
            const selectTopValidatorsPromises = tripChain.networkNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/vote-first-Round',
                    method: 'GET',
                    json: true,
                });
            });

            return Promise.all(selectTopValidatorsPromises);
        })
        .then(responses => {
            // Extract topValidators from each response
            console.log("responses of vote first round r here ")
            vote_first_round = responses.map(response => response.topValidators);

            // Prepare promises to call '/potential-leader' on each network node
            const potentialLeaderPromises = tripChain.networkNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/leader',
                    method: 'GET',
                    json: true,
                });
            });

            return Promise.all(potentialLeaderPromises);
        })
        .then(responses => {
            // Extract leader from each response
            global.leader = responses.map(response => response.leader);

            // Prepare promises to call '/announce-final-leader' on each network node
            const announceFinalLeaderPromises = tripChain.networkNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl.url + '/receive-leader-and-vote-final-leader',
                    method: 'POST',
                    json: true,
                });
            });

            return Promise.all(announceFinalLeaderPromises);
        })
        .then(responses => {
            // Extract finalLeader from each response
            finalLeader = responses.map(response => response.finalLeader);

            // Send the final response including the top validators, leader, and final leader
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
    // Start measuring execution time
    const startExecution = performance.now();

    // Start measuring CPU usage
    const startCPUUsage = process.cpuUsage();

    if (tripChain.networkNodes.length === 0) { 
        return res.status(404).json({ error: "No nodes registered in the network." });
    }
    
    // Retrieve all node reputations for broadcasting
    const allNodesReputation = reputationManager.getNodeReputations();
    
    // Determine the consensus validators 
    consensusManager.validators = consensusManager.getConsensusGroup(allNodesReputation);
    console.log("validators : 88888888888888888888888888888888888888888888888888888888888888888888888")
    console.log(consensusManager.validators)
    vote_first_round.push(consensusManager.validators);
    // console.log('validators choosen by the current node: ',vote_first_round)
    // Prepare promises for broadcasting validators
    const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/receive-validators',
            method: 'POST',
            body: { 
                validators: consensusManager.validators.map(validator => ({
                    nodeUrl: validator.nodeUrl,
                    reputationScore: validator.reputationScore,
                    role: validator.role,
                    weight: validator.weight,
                    //count: validator.count, // Include count
                })),
            },
            json: true,
        });
    });

    Promise.all(broadcastPromises)
    .then(data => {
        // Stop measuring execution time
        const endExecution = performance.now();

        // Stop measuring CPU usage
        const endCPUUsage = process.cpuUsage(startCPUUsage);

        // Calculate execution time
        const executionTime = endExecution - startExecution;

        // Get CPU usage
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        // Send the response once all broadcasts are successful 
        res.json({
            message: "Consensus group created and broadcasted successfully.",
            validators: consensusManager.validators,
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms",
        });
    })
    .catch(error => {
        // Handle errors from promises
        console.error('Error broadcasting validators', error);
        res.status(500).json({ error: "Failed to broadcast validators" });
    });
});

// Endpoint to receive validators
app.post('/receive-validators', function(req, res) {
    const { validators } = req.body;
    console.log("validators recieved")
    vote_first_round.push(validators);
    // console.log('receive-validators', vote_first_round);
    res.status(200).json({ message: 'Validators received and stored.' });
});

let first_round_validators = []

// Endpoint to select the top two validators
app.get('/vote-first-Round', function(req, res) {
     // Start measuring execution time
     const startExecution = performance.now();

     // Start measuring CPU usage
     const startCPUUsage = process.cpuUsage();

    // console.log('vote_first_round: ', vote_first_round);
    // Count occurrences of each nodeUrl in the vote_first_round array
    const nodeCounts = vote_first_round.flat().reduce((acc, validator) => {
        const nodeUrl = validator.nodeUrl;
        const weight = validator.weight; // Include the weight of the validator
        const reputationScore = validator.reputationScore;
        
        // Ensure the nodeUrl exists before processing
        if (nodeUrl) {
            // Initialize or update the count and weight for each nodeUrl
            if (!acc[nodeUrl]) {
                acc[nodeUrl] = { count: 0, weight ,reputationScore};
            }
            else {
                acc[nodeUrl].count++; // Increment count on subsequent occurrences
            }
        }
        
        return acc;
    }, {});
    
    //console.log(nodeCounts);
    // Find the top two nodes with the highest counts
    const sortedNodes = Object.keys(nodeCounts).sort((a, b) => {
        // Sort first by count, then by weight if counts are equal
        if (nodeCounts[b].count === nodeCounts[a].count) {
            return nodeCounts[b].weight - nodeCounts[a].weight;
        } else {
            return nodeCounts[b].count - nodeCounts[a].count;
        }
    });

    // Extract top two nodes with counts and weights
    const topTwoNodes = sortedNodes.slice(0, 2).map(node => ({
        nodeUrl: node,
        count: nodeCounts[node].count,
        weight: nodeCounts[node].weight,
        reputationScore: nodeCounts[node].reputationScore,
    }));

    first_round_validators.push(topTwoNodes);
    // console.log("Top two nodes with the most appearances:", topTwoNodes);

    // Prepare promises for broadcasting the topTwoNodes
    const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/receive-top-two-nodes',
            method: 'POST',
            body: { topTwoNodes }, // Ensure topTwoNodes is sent correctly in the body
            json: true,
        });
    });

    // Execute all broadcast promises
    Promise.all(broadcastPromises)
    .then(responses => {

        // Stop measuring execution time
        const endExecution = performance.now();

        // Stop measuring CPU usage
        const endCPUUsage = process.cpuUsage(startCPUUsage);

        // Calculate execution time
        const executionTime = endExecution - startExecution;

        // Get CPU usage
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;

        res.json({ note: 'All top two nodes broadcasted successfully.',
            executionTime: executionTime + ' ms',
            cpuUsage: cpuUsage + ' ms', 
        });
    })
    .catch(error => {
        // Stop measuring execution time in case of error
        const endExecution = performance.now();

        // Stop measuring CPU usage in case of error
        const endCPUUsage = process.cpuUsage(startCPUUsage);

        // Calculate execution time
        const executionTime = endExecution - startExecution;

        // Get CPU usage
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        // Respond with error message
        res.status(500).json({ error: 'Error broadcasting top two nodes.',
        executionTime: executionTime + ' ms',
        cpuUsage: cpuUsage + ' ms',
         });
    });
});

// Endpoint to receive top two nodes
app.post('/receive-top-two-nodes', function(req, res) {
    const { topTwoNodes } = req.body;
    //console.log('Received top two nodes:', topTwoNodes);
    first_round_validators.push(topTwoNodes);
    res.status(200).json({ message: 'Top two nodes received and processed successfully.' });
});

app.get('/leader', function(req, res){
    
    if (!first_round_validators || first_round_validators.length === 0) {
        return res.status(404).json({ error: "Top two nodes not available." });
    }
    // Start measuring execution time
    const startExecution = performance.now();

    // Start measuring CPU usage
    const startCPUUsage = process.cpuUsage();
    // console.log('Attempting to select leader with:',first_round_validators);
    // Flatten the first_round_validators array if necessary (if it is nested)
    const flatValidators = first_round_validators.flat();
    // Sort first_round_validators by weight in descending order
    const sortedValidators = flatValidators.sort((a, b) => b.weight - a.weight);
    if (sortedValidators.length > 1 && sortedValidators[0].weight === sortedValidators[1].weight) {
    // Select the leader with the highest weight
    global.leader = sortedValidators[0];

    // console.log('selected leader is: ',leader);
     // Broadcast the leader to the network nodes (assuming tripChain.networkNodes is an array of network node URLs)
     const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl.url + '/broadcast-leader',
            method: 'POST',
            body: { leader: global.leader },
            json: true,
        });
    });

    Promise.all(broadcastPromises)
        .then(data => {
             // Stop measuring execution time
             const endExecution = performance.now();

             // Stop measuring CPU usage
             const endCPUUsage = process.cpuUsage(startCPUUsage);
 
             // Calculate execution time
             const executionTime = endExecution - startExecution;
 
             // Get CPU usage
             const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
            res.json({
                message: "Leader selected and broadcasted successfully.",
                leader: global.leader,
                executionTime: executionTime + " ms",
                cpuUsage: cpuUsage + " ms",
            });
        })
        .catch(error => {
            // Stop measuring execution time in case of error
            const endExecution = performance.now();

            // Stop measuring CPU usage in case of error
            const endCPUUsage = process.cpuUsage(startCPUUsage);

            // Calculate execution time
            const executionTime = endExecution - startExecution;

            // Get CPU usage
            const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
            console.error('Error broadcasting leader', error);
            res.status(500).json({ error: "Failed to broadcast leader",
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms"
             });
        });
    }else{
        global.leader = consensusManager.selectLeader(first_round_validators);
        const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
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
            // Handle errors from promises
            console.error('Error broadcasting leader', error);
            res.status(500).json({ error: "Failed to broadcast leader" });
        }); 
    }  
});


app.post('/broadcast-leader', function(req, res) {
    const { leader } = req.body;
    //console.log('Leader received:', leader);
    res.status(200).json({ message: 'Leader received.', leader: leader });
});

// This endpoint accumulates received validators
app.post('/receive-leader-and-vote-final-leader', function(req, res) {
     // Start measuring execution time
     const startExecution = performance.now();

     // Start measuring CPU usage
     const startCPUUsage = process.cpuUsage();
    const { leader } = req.body;
    if (!leader ) {
        //console.error('Invalid leader data received:', req.body);
        return res.status(400).json({ message: 'Invalid leader data received.' });
    }
    

    //console.log('Leader object received:', leader);

    leaders.push({
        leader: leader.validator // Storing the URL string directly
    });

    if (leaders.length === 0) {
        return res.status(404).json({ error: "No leader data available." });
    }

    // Count each leader's appearances
    const leaderCounts = leaders.reduce((acc, leader) => {
        const leaderKey = JSON.stringify(leader);  // Convert leader object to a string to use as a key
        acc[leaderKey] = (acc[leaderKey] || 0) + 1;
        return acc;
    }, {});

    // Find the leader with the maximum count, and highest reputation in case of a tie
    const finalLeader = Object.entries(leaderCounts).reduce((max, [leaderString, count]) => {
        const leader = JSON.parse(leaderString);  // Parse the string back to an object
        // Include count in the leader object and compare reputationScore in case of count tie
        if (count > max.count || (count === max.count && leader.reputationScore > max.reputationScore)) {
            return { ...leader, count: count };  // Flatten the structure to include count directly
        }
        return max;
    }, { reputationScore: -1, count: 0 }); // Set initial max object with count and low reputationScore

    // Set the global finalLeader (optional, only if you need it outside this scope)
    global.leader = finalLeader;

    // Respond with the final leader
    if (!leader || leader.reputationScore === -1) {
         // Stop measuring execution time in case of error
         const endExecution = performance.now();

         // Stop measuring CPU usage in case of error
         const endCPUUsage = process.cpuUsage(startCPUUsage);
 
         // Calculate execution time
         const executionTime = endExecution - startExecution;
 
         // Get CPU usage
         const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
        return res.status(404).json({ error: "No valid leader found." ,
            executionTime: executionTime + " ms",
            cpuUsage: cpuUsage + " ms"
        });
    }
      // Stop measuring execution time
      const endExecution = performance.now();

      // Stop measuring CPU usage
      const endCPUUsage = process.cpuUsage(startCPUUsage);
  
      // Calculate execution time
      const executionTime = endExecution - startExecution;
  
      // Get CPU usage
      const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;

    res.json({
        message: "Final leader determined based on the highest number of appearances, with ties broken by reputation score.",
        finalLeader: leader, // This should now directly return the leader object in the desired format
    });
    res.status(200).json({ message: 'Leader received.', leader: leader ,
        executionTime: executionTime + " ms",
        cpuUsage: cpuUsage + " ms"
    });
});



