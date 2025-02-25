const express = require('express');
//const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
//creating an app
//with this app we can handle different route or endpoints
const app = express();
const cors = require('cors');
//let receivedValidators = [];
let vote_first_round = [];
// Global variable to hold the top validators
//let topValidators = [];
let leaders = [];
global.finalLeader = null;
const bodyParser = require('body-parser');
const cron = require('node-cron');

// import our blockchain
const blockchain = require('./blockchain');
const tripContract = require('./TravelContract');
//const SmartContract = require('./SmartContract');
//const networkHelpers = require('./networkHelpers');
//const SmartContract = require('./SmartContractManager');
//const TravelContract = require('./TravelContract');
// create an instance from our blockchain
const tripChain= new blockchain();

const port = process.argv[2];
app.use(cors());
const rp = require('request-promise');
const Signer = require('./Signer');
const consensus = require('./consensus');
const Reputation = require('./Reputation');
const SmartContractsManager = require('./SmartContractManager');

// Creating an instance of Reputation
const reputationManager = new Reputation();
const contract= new tripContract();
const signer = new Signer();
const consensusManager = new consensus();
const smartContractsManager = new SmartContractsManager();


//if a request comes in with a json or form data, we parse this data so we can access it  with any of the route here
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//it will send our entire blockchain
//this is what this endpoint is going to do: send the entire blockchain back to who ever called this endpoint 
app.get('/blockchain', function (req, res){
    res.send(tripChain);
});

app.get('/blockchain', function (req, res) {
    // Assuming the blockchain data is stored in an array of blocks
    res.json(tripChain.chain);
});

// // Adjusted the endpoint path to include the node number
// app.post('/start-nodes', (req, res) => {
//     const {port} = req.body;
//     const nodeNumber = port - 3000; // Adjust to match node number with port
//     exec(`npm run node_${nodeNumber}`, (err, stdout, stderr) => {
//         if (err) {
//             console.error('Error starting node:', err);
//             callback(err);
//         } else {
//             console.log(`Node ${nodeNumber} started on port ${port}`);
//             console.log(stdout);
//             console.error(stderr);
//             res.send('Command executed successfully');
//         }
//     });
// });

// Read the JSON file containing the list of nodes
const nodes = JSON.parse(fs.readFileSync('nodes.json'));

app.post('/execute-all', function(req, res) {
    // Trigger the /broadcast-travel-data endpoint after executing executeToJson
    if (tripChain.currentNodeUrl) {
        tripChain.executePHP((errorPHP, resultPHP) => {
            if (errorPHP) {
                res.status(500).json({ error: 'Failed to execute PHP script.', details: errorPHP.message });
            } else {
                tripChain.executeToJson((errorToJson, resultToJson) => {
                    if (errorToJson) {
                        console.error('Execution to Json failed:', errorToJson);
                        res.status(500).json({ error: 'Failed to execute toJson.js script.', details: errorToJson.message });
                    } else {
                        const { publicKey, privateKey } = req.body;
                        const filePath = path.join(__dirname, '/organized_trip_data/travel.json');

                        fs.readFile(filePath, 'utf8', (err, data) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to read travel data file for broadcasting.' });
                            }

                            const Data = { travelData: data };
                            const signature = signer.signTransaction(Data, privateKey);

                            const broadcastPromises = tripChain.networkNodes.map(nodeUrl => {
                                return rp({
                                    uri: nodeUrl + '/receive-travel-data',
                                    method: 'POST',
                                    body: {
                                        travelData: Data,
                                        signature: signature,
                                        publicKey: publicKey
                                    },
                                    json: true
                                }).catch(error => {
                                    return { nodeUrl: nodeUrl, status: 'Failed', message: error.message };
                                });
                            });

                            Promise.all(broadcastPromises).then(results => {
                                res.json({ note: 'Travel data broadcasted successfully.', results: results, phpResult: resultPHP, toJsonResult: resultToJson });
                            }).catch(error => {
                                res.status(500).json({ error: 'Failed to broadcast travel data.', details: error.message });
                            });
                        });
                    }
                });
            }
        });
    } else {
        res.status(403).json({ error: 'This node is not authorized to execute these scripts.' });
    }
});

// app.post('/execute-all', function(req, res) {
//     // Trigger the /broadcast-travel-data endpoint after executing executeToJson
//     if (tripChain.currentNodeUrl) {
//         tripChain.executePHP((errorPHP, resultPHP) => {
//             //console.log('hello')
//             if (errorPHP) {
//                 res.status(500).json({ error: 'Failed to execute PHP script.', details: errorPHP.message });
//             } else {
//                 //console.log('second hello')
//                 tripChain.executeToJson((errorToJson, resultToJson) => {
//                     if (errorToJson) {
//                         // Log detailed error information
//                         console.error('Execution to Json failed:', errorToJson);
//                         res.status(500).json({ error: 'Failed to execute toJson.js script.', details: errorToJson.message });
//                     } else {
//                         const { publicKey, privateKey } = req.body;
//                         const filePath = path.join(__dirname, '/organized_trip_data/travel.json');
                        
//                         fs.readFile(filePath, 'utf8', (err, data) => {
//                             if (err) {
//                                 return res.status(500).json({ error: 'Failed to read travel data file for broadcasting.' });
//                             }
                            
//                             const Data = { travelData: data };
//                             const signature = signer.signTransaction(Data, privateKey);
                            
//                             const broadcastPromises = tripChain.networkNodes.map(nodeUrl => {
//                                 return rp({
//                                     uri: nodeUrl + '/receive-travel-data',
//                                     method: 'POST',
//                                     body: {
//                                         travelData: Data,
//                                         signature: signature,
//                                         publicKey: publicKey
//                                     },
//                                     json: true
//                                 }).catch(error => {
//                                     return { nodeUrl: nodeUrl, status: 'Failed', message: error.message };
//                                 });
//                             });
                     
//                             Promise.all(broadcastPromises).then(results => {
//                                 res.json({ note: 'Travel data broadcasted successfully.', results: results });
//                             }).catch(error => {
//                                 res.status(500).json({ error: 'Failed to broadcast travel data.', details: error.message });
//                             });
//                         });
                        
//                         res.json({
//                             phpResult: resultPHP,
//                             toJsonResult: resultToJson
//                         });
//                     }
//                 });
//             }
//         });
//     } else {
//         res.status(403).json({ error: 'This node is not authorized to execute these scripts.' });
//     }
// });

//                     } else {
//                         res.json({
//                             phpResult: resultPHP,
//                             toJsonResult: resultToJson
//                         });
//                     // console.log('third hello')    
//                     }
//                 });
//             }
//         });
//     } else {
//         res.status(403).json({ error: 'This node is not authorized to execute these scripts.' });
//     }
// });
// '0 */2 * * *'
// '*/30 * * * * *'
// Schedule the endpoint execution for each node every half minute
// nodes.forEach(node => {
    cron.schedule('0 */2 * * *', () => {
        // Trigger the endpoint for the current node
        // const nodeUrl = node.url;
        // Assuming tripChain.currentNodeUrl should be set based on the current node
        tripChain.currentNodeUrl = nodeUrl;
        // Trigger the endpoint
        fetch(`${nodeUrl}/execute-all`)
            .then(response => console.log(`Execution initiated for node: ${tripChain.currentNodeUrl}`))
            .catch(error => console.error(`Error executing for node: ${tripChain.currentNodeUrl}`, error));
    });


// Schedule the execution of exportToJson.js for each node every two hours
// nodes.forEach(node => {
    cron.schedule('0 */2 * * *', () => { // Execute every two hours
        // Execute the exportToJson.js script using Node.js
        const command = `node ${path.join(__dirname, 'exportToJson.js')}`; // Path to exportToJson.js
        console.log(command)
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Command stderr: ${stderr}`);
                return;
            }
            console.log(`Command stdout: ${stdout}`);
        });
    });
// });

// //  Broadcast travel data to all network nodes
// app.post('/broadcast-travel-data', function(req, res) {
//     const { publicKey,privateKey } = req.body ;
//     //const filePath = 'C:\\xampp\\htdocs\\PFE-v4\\PFE-v1\\Imp\\travelData.json'
//     const filePath = path.join(__dirname, '/organized_trip_data/travel.json');
//     fs.readFile(filePath, 'utf8', (err, data) => {
//         if (err) {
//             return res.status(500).json({ error: 'Failed to read travel data file for broadcasting.' });
//         }
//          // Create the transaction object to sign
//          const Data= { travelData: data };
//          //console.log("Data= ",Data);
         
//          // Sign the travel data with the private key using the signTransaction method
//          const signature = signer.signTransaction(Data, privateKey);
 
//          const broadcastPromises = tripChain.networkNodes.map(nodeUrl => {
//              return rp({
//                  uri: nodeUrl + '/receive-travel-data',
//                  method: 'POST',
//                  body: {
//                      travelData: data,
//                      signature: signature,
//                      publicKey: publicKey
//                  },
//                  json: true
//              }).catch(error => {
//                  return { nodeUrl: nodeUrl, status: 'Failed', message: error.message };
//              });
//          });
 
//          Promise.all(broadcastPromises).then(results => {
//             res.json({ note: 'Travel data broadcasted successfully.', results: results });
//         }).catch(error => {
//             res.status(500).json({ error: 'Failed to broadcast travel data.', details: error.message });
//         });
//     });
// })/
//         const broadcastPromises = tripChain.networkNodes.map(nodeUrl => {
//             return rp({
//                 uri: nodeUrl + '/receive-travel-data',
//                 method: 'POST',
//                 body: { travelData: data },
//                 json: true
//             }).catch(error => {
//                 return { nodeUrl: nodeUrl, status: 'Failed', message: error.message };
//             });
//         });

//         Promise.all(broadcastPromises).then(results => {
//             res.json({ note: 'Travel data broadcasted successfully.', results: results });
//         });
//     });
// });

// Endpoint to receive travel data
app.post('/receive-travel-data', function(req, res) {
    const travelData = req.body.travelData;
    const filePath = path.join(__dirname, '/organized_trip_data/travel.json');
    fs.writeFile(filePath, travelData, 'utf8', (err) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to save received travel data.' });
        }
        res.send({ note: 'Travel data updated successfully from broadcast.' });
    });
});

// Verify if the travel data file exists on this node
app.get('/verify-travel-data', function(req, res) {
    // Direct use of absolute path
    // const filePath = 'C:/xampp/htdocs//PFE-v1/Imp/pfe/Imp/dev/organized_trip_data/travel.json';
    const filePath = path.join(__dirname, '/organized_trip_data/travel.json');
    //console.log(filePath);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        const status = err ? 'Absent' : 'Present';
        const message = err ? 'Travel data file does not exist on this node.' : 'Travel data file exists on this node.';
        res.json({ status: status, message: message });
    });
});

// Check the existence of the travel data file on all nodes
app.get('/check-nodes-files', function(req, res) {
    const statusPromises = tripChain.networkNodes.map(nodeUrl => {
        return rp({
            uri: nodeUrl + '/verify-travel-data',
            method: 'GET',
            json: true
        }).catch(() => {
            return { url: nodeUrl, status: 'Error', message: 'Failed to connect to node.' };
        });
    });

    Promise.all(statusPromises).then(results => {
        res.json(results);
    });
});
// app.get('/generate-keys', (req, res) => {
//     try {
//         // Generate key pair
//         const { publicKey, privateKey } = signer.generateKeyPair();
        
//         // Send the keys as a response
//         res.status(200).json({
//             publicKey: publicKey,
//             privateKey: privateKey
//         });
//     } catch (error) {
//         console.error("Error generating keys:", error);
//         res.status(500).json({ message: "Error generating keys." });
//     }
// });
function readTransactionsData() {
    try {
        const data = fs.readFileSync('transactionsData.json', 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading transactions data:', error);
        }
        return [];
    }
}

function writeTransactionsData(transactionsData) {
    fs.writeFileSync('transactionsData.json', JSON.stringify(transactionsData, null, 4));
}

app.post('/transaction/broadcast', async (req, res) => {
    // Read keys from JSON file
    const keys = JSON.parse(fs.readFileSync('./nodes.json', 'utf8'));
    const { userId, nbrPlaces ,port} = req.body;
    // console.log(req.body);
    // console.log("port= ",port);
    // console.log('User ID:', userId);
    // console.log('nbre de place:', nbrPlaces);
    try {
            // Find the key-pair for the provided port
        const keyEntry = keys.find(entry => entry.url === `http://localhost:${port}`);
        // console.log('keyEntry: ',keyEntry);
        // console.log("key: ",keyEntry)
        if (!keyEntry) {
            return res.status(400).json({ error: 'No key-pair found for the specified port' });
        }

        const { publicKey, privateKey } = keyEntry;
        // console.log(publicKey)
        // console.log(publicKey)
        // Generate transactions from user data
        const transactions = await tripChain.createNewTransaction(userId);
        // console.log('transactions: ',transactions);
        //console.log('Created Transactions:', transactions);
        // // Generate public and private keys for signing the transactions
        // const { publicKey, privateKey } = signer.generateKeyPair();
        // Prepare and execute validation for each transaction
        const transactionPromises = transactions.map(transaction =>
            new Promise((resolve, reject) => {
                // Sign the transaction
                const signature = signer.signTransaction(transaction, privateKey);
                const transactionObj = {
                    newTransaction: transaction,
                    publicKey: publicKey,
                    signature: signature
                };

                // Broadcast the transaction to all network nodes for validation
                const validationPromises = tripChain.networkNodes.map(networkNodeUrl => {
                    const requestOptions = {
                        url: `${networkNodeUrl}/transaction/validate`,
                        method: 'POST',
                        body: transactionObj,
                        json: true
                    };
                    return rp(requestOptions);
                });

                // Evaluate all validation responses
                Promise.all(validationPromises)
                    .then(results => {
                        const validationResults = results.map(result => result.isValid);
                        const validCount = validationResults.filter(isValid => isValid).length;
                        const invalidCount = validationResults.length - validCount;

                        // Check if the majority of nodes validated the transaction
                        if (validCount > invalidCount) {
                            tripChain.addTransactionToPendingTransactions(transactionObj);
                            tripChain.decrementPlaces(transaction.travelId, nbrPlaces); // Decrement places if validated by majority
                            resolve({ ...transactionObj, validCount, invalidCount, consensus: true });
                        } else {
                            reject({ ...transactionObj, validCount, invalidCount, consensus: false, error: 'Transaction rejected by the majority of nodes' });
                        }
                    })
                    .catch(error => {
                        console.error('Validation Error:', error);
                        reject({ error: error.toString() });
                    });
            })
        );
        const validatedTransactions = (await Promise.allSettled(transactionPromises))
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        // Read existing transactions data
        const transactionsData = readTransactionsData();

        // Append new transactions with the localhost:port info
        validatedTransactions.forEach(tx => {
            transactionsData.push({ ...tx, nodeUrl: `http://localhost:${port}` });
        });

        // Write updated transactions data back to the file
        writeTransactionsData(transactionsData);

        res.json({ note: 'Transaction consensus process completed.', transactions: validatedTransactions });
    } catch (error) {
        console.error('Error during transaction processing:', error);
        res.status(500).json({ error: 'Failed to create and broadcast transactions.', details: error.toString() });
    }
});


//         const validatedTransactions = (await Promise.allSettled(transactionPromises))
//             .filter(result => result.status === 'fulfilled')
//             .map(result => result.value);
        
//         res.json({ note: 'Transaction consensus process completed.', transactions: validatedTransactions });
//     } catch (error) {
//         console.error('Error during transaction processing:', error);
//         res.status(500).json({ error: 'Failed to create and broadcast transactions.', details: error.toString() });
//     }
// });

app.post('/transaction/validate', function(req, res) {
    const { newTransaction, publicKey, signature } = req.body;

    // Validate transaction using the detailed travel data
    tripChain.validateTransaction(newTransaction, (err, isValid) => {
        if (err) {
            console.error("Validation error:", err);
            return res.status(500).json({ error: "Error validating transaction", details: err.toString() });
        }

        if (!isValid) {
            return res.json({ isValid: false, note: "Transaction does not match any valid travel data." });
        }

        // If the transaction is valid, add it to the pending transactions
        tripChain.addTransactionToPendingTransactions({
            newTransaction,
            publicKey,
            signature
        });

        // Return a successful validation message
        res.json({ isValid: true, note: "Transaction validated and added successfully." });
    });
});

// app.post('/update-smartContract', function(req, res) {
//     const updatedContract = req.body;
//     let found = false;

//     // First, try to find and update the contract in the smartContracts array
//     const contractIndex = bitcoin.smartContracts.findIndex(c => c.id === updatedContract.id);
//     if (contractIndex !== -1) {
//         smartContractsManager.smartContracts[contractIndex] = updatedContract;
//         found = true;
//     } else {
//         // If not found in smartContracts, search within the blocks
//         tripChain.chain.forEach(block => {
//             const blockContractIndex = block.contracts.findIndex(c => c.id === updatedContract.id);
//             if (blockContractIndex !== -1) {
//                 block.contracts[blockContractIndex] = updatedContract;
//                 found = true;
//             }
//         });
//     }

//     if (!found) {
//         res.status(404).send({ note: 'Contract not found in smartContracts or any block\'s contracts.' });
//     } else {
//         res.json({
//             note: 'Smart contract updated successfully.',
//             updatedContract: updatedContract
//         });
//     }
// });

// app.get('/execute-smart-contract', function(req, res){
//     let smartContractExecuted = false;

//     tripChain.chain.forEach(block => {
//         if (block.creatorNodeUrl === tripChain.currentNodeUrl) {
//             console.log(`This specific block (index: ${block.index}) was created by this node.`);
//             console.log('The smart contract is executed by this node: ', tripChain.currentNodeUrl);
//             contract.distributePayments();
//             smartContractExecuted = true; // Mark that the smart contract was executed
//         }
//     });

//     if (smartContractExecuted) {
//         res.json({ message: `Executed smart contracts by node ${tripChain.currentNodeUrl}.` });
//     } else {
//         res.json({ message: "No smart contracts were executed." });
//     }

// });

// app.get('/execute-smart-contract', function(req, res) {
//     let smartContractExecuted = false; // Initialize the flag outside the loop

//     tripChain.chain.forEach(block => {
//         if (block.creatorNodeUrl === tripChain.currentNodeUrl) {
//             console.log(`This specific block (index: ${block.index}) was created by this node.`);
//             console.log('The smart contract is executed by this node: ', tripChain.currentNodeUrl);
            
//             // Iterate through transactions within the block
//             block.transactions.forEach(transaction => {
//                 // Access newTransaction object
//                 const newTransaction = transaction.newTransaction;
//                 // Access endDate from the newTransaction object
//                 const endDate = transaction.newTransaction.endDate;
//                 console.log('hi there',endDate);
//                  // Check if endDate exists
//                  if (endDate) {
//                     console.log('Transaction endDate:', endDate);

//                     // Create an instance of SmartContract with the endDate
//                     const smartContract = new SmartContract({ endDate });

//                     // Call the Payments method
//                     smartContract.Payments();

//                     smartContractExecuted = true; // Mark that the smart contract was executed
//                 }
//             });
//         }
//     });

//     // Check if any smart contract was executed and send the response accordingly
//     if (smartContractExecuted) {
//         res.json({ message: `Executed smart contracts by node ${tripChain.currentNodeUrl}.` });
//     } else {
//         res.json({ message: "No smart contracts were executed." });
//     }
// });

// Array to store paths of HTML files for each SmartContract instance
const htmlPaths = [];

app.get('/show-smart-contract', function(req, res) {
    let redactedParagraphs = []; // Initialize an array to store redacted paragraphs

    tripChain.chain.forEach(block => {
        if (block.creatorNodeUrl === tripChain.currentNodeUrl) {
            // console.log(`This specific block (index: ${block.index}) was created by this node.`);
            // console.log('The smart contract is executed by this node: ', tripChain.currentNodeUrl);

            // Iterate through transactions within the block
            block.transactions.forEach((transaction, transactionIndex) => {
                // Access newTransaction object
                const newTransaction = transaction.newTransaction;
                //console.log("endDate: ", newTransaction.endDate);
                // Check if the transaction contains an endDate property
                if (newTransaction.endDate) {
                    // Extract endDate from the transaction
                    const endDate = newTransaction.endDate;
                    const creditNum = newTransaction.num_credit;
                    //console.log("endDate2: ", newTransaction.endDate);
                    // Create an instance of SmartContract with the endDate
                    const smartContract = new SmartContract({ endDate });

                    // Call the Payments method
                    smartContract.Payments();

                    // Check if payment is due and generate redacted paragraph if true
                    if (smartContract.paid === false) {
                        // Generate redacted paragraph for the transaction
                        const redactedText = `
                        <h2>Client Contract Agreement</h2>
                        <p>This contract is made between the tripChain Website  and the client.</p>
                        <h3>Contract Details</h3>
                        <p>
                            This agreement is made between tripChain website and the client, <b>${newTransaction.userFullName}</b>.
                            The client has booked a trip from <b>${newTransaction.startingLocation}</b> to <b>${newTransaction.destination}</b>,
                            starting on <b>${newTransaction.startDate}</b> and ending on <b>${newTransaction.endDate}</b>.
                            The total price for this trip is <b>${newTransaction.totalPrice} DA</b>.
                        </p>
                        <p>
                            The trip has been paid in full by the client using the credit card number <b>${creditNum}</b>.
                            The client has reserved the following place: <b>${newTransaction.placeAvailable}</b>.
                        </p>
                    `;

                        
                        // Create an HTML file for this SmartContract instance
                        const htmlContent = generateHTML(redactedText);

                        // Save HTML content to a file
                        const fileName = `smart_contract_${block.index}_${transactionIndex}.html`;
                        const filePath = `./dev/public/${fileName}`; // Assuming a public directory exists
                        fs.writeFileSync(filePath, htmlContent);
                        
                        // Store the path of the HTML file
                        htmlPaths.push(fileName);

                        // Add redacted paragraph to the array
                        redactedParagraphs.push(htmlContent);
                    }
                }
            });
        }
    });

    // Check if any redacted paragraphs were generated and send the response accordingly
    if (redactedParagraphs.length > 0) {
        res.json({ message: "Smart contract HTML files generated.", files: htmlPaths });
    } else {
        res.json({ message: "No payments are due for contracts." });
    }
});

// Function to generate HTML content for SmartContract instance
function generateHTML(redactedText) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Contract Agreement</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 40px;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h2 {
                color: #333;
                text-align: center;
            }
            h3 {
                color: #333;
                text-align: center;
            }
            p {
                font-size: 1.1em;
                line-height: 1.6;
            }
        </style>
    </head>
    <body>
        ${redactedText}
    </body>
    </html>
`;

}
// Endpoint to serve a page listing all SmartContract instances
app.get('/smart-contracts', function(req, res) {
    // Generate HTML content listing all SmartContract instances
    const htmlContent = generateSmartContractsPage(htmlPaths);

    // Send the HTML content as the response
    res.send(htmlContent);
});

app.get('/download/:fileName', function(req, res) {
    const fileName = req.params.fileName;
    const filePath = `./dev/public/${fileName}`; // Assuming a public directory exists

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        // Set appropriate headers for download
        res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
        res.setHeader('Content-type', 'text/html');

        // Stream the file to the client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).send("File not found.");
    }
});

app.post('/update-reputation', function(req, res) {
    const { leaderUrl, newReputation ,role} = req.body;
    //consensusManager.validators = bitcoin.updateNodeReputation(leaderUrl, newReputation, role);
    consensusManager.nodesReputations = reputationManager.updateNodeReputation(leaderUrl, newReputation, role);
    // if (consensusManager.leader.nodeUrl === leaderUrl) {
    //     consensusManager.leader.reputationScore = newReputation;
    // }
    res.json({ note: "Reputation updated successfully." });
});

app.post('/verify-and-vote', function(req, res) {
    const newBlock = req.body.newBlock;
    //console.log('new block=', newBlock);
    // Verify the reputation of the node that created the block
    const creatorReputation = newBlock.creatorReputation;
    //console.log('creator reputation =',creatorReputation);

    // Set the threshold reputation required for validation
    const thresholdReputation = 10; // Example threshold value

    // Check if the creator's reputation meets the threshold
    if (creatorReputation < thresholdReputation) {
        res.json({ vote: 'no', reason: 'Creator reputation below threshold.' });
        return;
    }

    // Verify the transactions in the block
    const isValid = newBlock.transactions.every(tx => {
        return consensusManager.verifyTransactionSignature(tx.newTransaction, tx.signature, tx.publicKey);
    });

    // Cast vote based on transaction validity
    const vote = isValid ? 'yes' : 'no';

    res.json({ vote: vote });
});

app.post('/receive-new-block', function(req, res){
    const newBlock = req.body.newBlock;
    const lastBlock = tripChain.getLastBlock();
    const correctHash = lastBlock.hash == newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 == newBlock['index'];

    if (correctHash && correctIndex ){
        tripChain.chain.push(newBlock);
        tripChain.pendingTransactions = [];
        smartContractsManager.smartContracts = []; 
        res.json({ 
            note: "New block received and accepted",
            newBlock: newBlock
        });
    }else{
        res.json({
            note: "New block rejected  or already exists. ",
            newBlock: newBlock
        })
    }
});

app.get('/current-node-info', function(req, res) {
    const nodeInfo = tripChain.getCurrentNodeInfo();
    res.json({
        message: "Current Node Information",
        data: nodeInfo
    });
});

app.get('/info_nodes', function(req, res) {
    // Access the nodesReputations from the reputationManager
    const reputations = reputationManager.getNodeReputations();
    // Send the reputations as a JSON response
    res.json(reputations);
});

function readNodeDetailsFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

function saveNodeDetailsToFile(newNodeDetails, filePath) {
    const nodeDetailsList = readNodeDetailsFromFile(filePath);
    const nodeExists = nodeDetailsList.some(node => node.url === newNodeDetails.url);

    if (!nodeExists) {
        nodeDetailsList.push(newNodeDetails);
        fs.writeFileSync(filePath, JSON.stringify(nodeDetailsList, null, 2));
        console.log('Node details saved successfully.');
    } else {
        console.log('Node URL already exists. Not saving the node details.');
    }
}

// // Function to save node details to a JSON file
// const saveNodeDetailsToFile = (nodeDetails) => {
//     const filePath = './nodes.json';

//     // Read the existing nodes from the file
//     fs.readFile(filePath, (err, data) => {
//         if (err) {
//             // If file doesn't exist, initialize with an empty array
//             if (err.code === 'ENOENT') {
//                 const nodes = [nodeDetails];
//                 fs.writeFile(filePath, JSON.stringify(nodes, null, 2), (err) => {
//                     if (err) {
//                         console.error('Error writing file:', err);
//                     } else {
//                         console.log('File initialized with new node.');
//                     }
//                 });
//             } else {
//                 console.error('Error reading file:', err);
//             }
//         } else {
//             // File exists, parse the existing data and add the new node
//             try {
//                 const nodes = JSON.parse(data);
//                 nodes.push(nodeDetails);
//                 fs.writeFile(filePath, JSON.stringify(nodes, null, 2), (err) => {
//                     if (err) {
//                         console.error('Error writing file:', err);
//                     } else {
//                         console.log('New node added to file.');
//                     }
//                 });
//             } catch (parseError) {
//                 console.error('Error parsing JSON:', parseError);
//             }
//         }
//     });
// };

// const saveNodeDetailsToFile = (nodeDetails) => {
//     const filePath = './nodes.json';

//     fs.readFile(filePath, (err, data) => {
//         if (err) {
//             if (err.code === 'ENOENT') {
//                 const nodes = [nodeDetails];
//                 fs.writeFile(filePath, JSON.stringify(nodes, null, 2), (err) => {
//                     if (err) {
//                         console.error('Error writing file:', err);
//                     } else {
//                         console.log('File initialized with new node.');
//                     }
//                 });
//             } else {
//                 console.error('Error reading file:', err);
//             }
//         } else {
//             try {
//                 const nodes = JSON.parse(data);
//                 // Check if the node already exists
//                 const nodeExists = nodes.some(existingNode => existingNode.id === nodeDetails.id);
//                 if (!nodeExists) {
//                     nodes.push(nodeDetails);
//                     fs.writeFile(filePath, JSON.stringify(nodes, null, 2), (err) => {
//                         if (err) {
//                             console.error('Error writing file:', err);
//                         } else {
//                             console.log('New node added to file.');
//                         }
//                     });
//                 } else {
//                     console.log('Node already exists in file.');
//                 }
//             } catch (parseError) {
//                 console.error('Error parsing JSON:', parseError);
//             }
//         }
//     });
// };



// Function to read transactions data from file
function readTransactionsData() {
    try {
        const data = fs.readFileSync('transactionsData.json', 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading transactions data:', error);
        }
        return [];
    }
}

// app.post('/register-and-broadcast-node', async function(req, res){
//     try {
//         const { newNodeUrl, roles } = req.body; // Capture only the newNodeUrl and role from the request
//         const defaultReputation = 10; // Set the default reputation value
        
//         // Check if the node is already registered
//         if (tripChain.networkNodes.indexOf(newNodeUrl) !== -1) {
//             return res.json({ note: 'Node is already registered.' });
//         }

//         // Generate key pair for the new node
//         const { publicKey, privateKey } = signer.generateKeyPair();
        
//         // Register the new node URL
//         tripChain.networkNodes.push(newNodeUrl);

//         // Update the reputation for the new node with the default value
//         reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);
//         reputationManager.updateNodeReputation(tripChain.currentNodeUrl, defaultReputation, roles);

//         // Save the new node details to a JSON file
//         const newNodeDetails = { url: newNodeUrl, roles: roles, publicKey: publicKey ,privateKey: privateKey};
//         saveNodeDetailsToFile(newNodeDetails);

//         // Read existing nodes from nodes.json file
//         fs.readFile('./nodes.json', async (err, data) => {
//             if (err) {
//                 console.error('Error reading nodes file:', err);
//             } else {
//                 try {
//                     const existingNodes = JSON.parse(data);
//                     // Add existing nodes to networkNodes array
//                     existingNodes.forEach(node => {
//                         if (tripChain.networkNodes.indexOf(node.url) === -1) {
//                             tripChain.networkNodes.push(node.url);
//                         }
//                     });
//                 } catch (parseError) {
//                     console.error('Error parsing JSON from nodes file:', parseError);
//                 }
//             }
//         });

//         // Broadcast the newNodeUrl to the other nodes 
//         const regNodePromises = tripChain.networkNodes
//             .filter(networkNodeUrl => networkNodeUrl !== newNodeUrl) // Exclude the new node itself
//             .map(networkNodeUrl => {
//                 const requestOptions = {
//                     url: networkNodeUrl + '/register-node',
//                     method: 'POST',
//                     body: {
//                         newNodeUrl: newNodeUrl,
//                         newNodeReputation: defaultReputation,
//                         roles: roles,
//                         publicKey: publicKey
//                     },
//                     json: true,
//                 };
//                 return rp(requestOptions).catch(error => {
//                     // Handle errors, but don't propagate them
//                     if (error.statusCode === 400) {
//                         console.error('Node is already registered:', error.error.note);
//                     } else {
//                         console.error('Error registering node:', error);
//                     }
//                 });
//             });

//         // Wait for all registration promises to resolve
//         await Promise.all(regNodePromises);
//         // Broadcast node registration to the new node
//         const allNodesReputation = reputationManager.getNodeReputations(); 
//         const bulkRegisterOptions = {
//             url: newNodeUrl + '/register-nodes-bulk',
//             method: 'POST',
//             body: {
//                 allNetworkNodes: [...tripChain.networkNodes, tripChain.currentNodeUrl],
//                 nodesReputation: allNodesReputation, 
//                 roles: roles,
//                 publicKey: publicKey,
//             },
//             json: true,
//         };
//         await rp(bulkRegisterOptions);

//         // Broadcast travel data to the new node
//         await rp({
//             url: tripChain.currentNodeUrl + '/broadcast-travel-data',
//             method: 'POST',
//             body: {
//                 publicKey: publicKey,
//                 privateKey: privateKey
//             },
//             json: true
//         });

//         // Read existing transactions data
//         const transactionsData = readTransactionsData();
        
//         // Send transactions to the new node
//         const transactionsOptions = {
//             url: newNodeUrl + '/receive-transactions',
//             method: 'POST',
//             body: {
//                 transactions: transactionsData
//             },
//             json: true
//         };
//         await rp(transactionsOptions);

//         // // Broadcast transactions data to the current node itself
//         //tripChain.addTransactionToPendingTransactions(transactionsData);

//         res.json({ note: 'New node registered with network successfully.' });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ note: 'An error occurred', error: error.message });
//     }
// });

// app.post('/register-node', function(req, res) {
//     const { newNodeUrl, newNodeReputation, roles } = req.body;
//     const nodeNotAlreadyPresent = tripChain.networkNodes.indexOf(newNodeUrl) === -1;
//     const notCurrentNode = tripChain.currentNodeUrl !== newNodeUrl;

//     // Read existing nodes from nodes.json file
//     fs.readFile('./nodes.json', (err, data) => {
//         if (err) {
//             console.error('Error reading nodes file:', err);
//             res.status(500).json({ note: 'Error reading nodes file.' });
//             return;
//         }

//         try {
//             const existingNodes = JSON.parse(data);
//             // Add existing nodes to networkNodes array
//             existingNodes.forEach(node => {
//                 if (tripChain.networkNodes.indexOf(node.url) === -1) {
//                     tripChain.networkNodes.push(node.url);
//                 }
//             });

//             if (nodeNotAlreadyPresent && notCurrentNode) {
//                 tripChain.networkNodes.push(newNodeUrl);
//                 reputationManager.updateNodeReputation(newNodeUrl, newNodeReputation, roles);
//                 res.json({ note: 'New node registered successfully.' });
//             } else if (!notCurrentNode) {
//                 // It's an update to the current node
//                 tripChain.currentNodeReputation = newNodeReputation; // Update the current node's reputation
//                 reputationManager.updateNodeReputation(newNodeUrl, newNodeReputation, roles); // Ensure the reputation manager is also updated
//                 res.json({ note: 'Current node reputation updated successfully.' });
//             } else {
//                 res.status(400).json({ note: 'Node is already registered.' });
//             }
//         } catch (parseError) {
//             console.error('Error parsing JSON from nodes file:', parseError);
//             res.status(500).json({ note: 'Error parsing nodes file.' });
//         }
//     });
// });

// Register a node and broadcast it on the network
app.post('/register-and-broadcast-node', function(req, res){
    const { newNodeUrl, roles } = req.body; // Capture only the newNodeUrl and role from the request
    const defaultReputation = 10; // Set the default reputation value
    // Generate key pair for the new node
    const { publicKey, privateKey } = signer.generateKeyPair();

    // Register the new node URL if it doesn't already exist
    if (tripChain.networkNodes.indexOf(newNodeUrl) === -1) {
        tripChain.networkNodes.push(newNodeUrl);
    }else{
        return res.json({ note: 'Node is already registered.' });
    }

    // Update the reputation for the new node with the default value
    reputationManager.updateNodeReputation(newNodeUrl, defaultReputation, roles);
    reputationManager.updateNodeReputation(tripChain.currentNodeUrl, defaultReputation, roles);
    // // Also update the current node's reputation to the default value if it is not set or different
    // if (tripChain.currentNodeReputation !== defaultReputation) {
    //     reputationManager.updateNodeReputation(tripChain.currentNodeUrl, defaultReputation, 'currentNodeRole'); // Assuming a role for the current node
    //     tripChain.currentNodeReputation = defaultReputation; // Make sure to update the local variable if used elsewhere
    // }
    // Save the new node details to a JSON file
    const newNodeDetails = { url: newNodeUrl, roles: roles, publicKey: publicKey ,privateKey: privateKey};
    saveNodeDetailsToFile(newNodeDetails, './nodes.json');

    // Read existing transactions data
    const transactionsData = readTransactionsData();
    //console.log("newNodeDetails: ",newNodeDetails);
    //this the second step where we broadcast the newNodeUrl to the others nodes 
    const regNodePromises = tripChain.networkNodes.map(networkNodeUrl => {
        const requestOptions = {
            url: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {
                newNodeUrl: newNodeUrl,
                newNodeReputation: defaultReputation,
                roles: roles,
                publicKey: publicKey
            },
            json: true,
        };
        return rp(requestOptions).catch(error => {
                                // Handle errors, but don't propagate them
                                if (error.statusCode === 400) {
                                    console.error('Node is already registered:', error.error.note);
                                } else {
                                    console.error('Error registering node:', error);
                                }
                            });
                    
    });

    Promise.all(regNodePromises)
    .then(() => {
        const allNodesReputation = reputationManager.getNodeReputations(); 
        const bulkRegisterOptions = {
            url: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: {
                allNetworkNodes: [...tripChain.networkNodes, tripChain.currentNodeUrl],
                nodesReputation: allNodesReputation, 
                roles: roles,
                // publicKey: publicKey,
            },
            json: true,
        };
        return rp(bulkRegisterOptions);
    })
    .then(() => {
        console.log('Execute all and Travel broadcast succeeded');
        const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
            return rp({
                url: networkNodeUrl + '/execute-all',
                // '/broadcast-travel-data',
                method: 'POST',
                body: {
                    publicKey: publicKey,
                    privateKey: privateKey
                },
                json: true
            }).catch(error => {
                return { nodeUrl: networkNodeUrl, status: 'Failed', message: error.message };
            });
        });
        return Promise.all(broadcastPromises);
    })
    .then(() => {
        // Send transactions to the new node
        const transactionsOptions = {
            url: newNodeUrl + '/receive-transactions',
            method: 'POST',
            body: {
                transactions: transactionsData
            },
            json: true
        };
        return rp(transactionsOptions);
    })
    .then(() => {
        const transactionsOptions = {
            url: tripChain.currentNodeUrl + '/receive-transactions',
            method: 'POST',
            body: {
                transactions: transactionsData
            },
            json: true
        };
        console.log("Sending transactions to current node: ", tripChain.currentNodeUrl, transactionsData);
        return rp(transactionsOptions);
    })
    .then(() => {
        res.json({ note: 'New node registered with network successfully.' });
    })
    .catch(error => {
        console.log(error);
        res.status(500).json({ note: 'An error occurred', error: error.message });
    });
});

// Endpoint for the new node to receive transactions
app.post('/receive-transactions', function(req, res) {
    const { transactions } = req.body;
    console.log('hello')
    transactions.forEach(transaction => {
        tripChain.addTransactionToPendingTransactions(transaction);
    });
    res.json({ note: 'Transactions received and added to pending transactions.' });
});
//     const regNodePromises = [];
    
//     tripChain.networkNodes.forEach(networkNodesUrl =>{
//         // '/register-node'
//         //requetOption is an object here
//         const requestOptions = {
//             url: networkNodesUrl + '/register-node',
//             method: 'POST',
//             //what data we gonna pass along with this request
//              body:{
//                 newNodeUrl: newNodeUrl,
//                 newNodeReputation: defaultReputation, // Ensure all nodes get the default reputation
//                 roles: roles,
//                 publicKey: publicKey
//             },
//             // send it as json data
//             json: true,
//         };

//     //this requeqt is going to send to use a promise
//     // we wanna get all this promises on a single array which is the registerNodePromises above 
//     // send out the messages
//         regNodePromises.push(rp(requestOptions));
//     });
  
//     Promise.all(regNodePromises)
//     .then(data => {
//         // This is a placeholder for how you might get or construct this data
//         const allNodesReputation = reputationManager.getNodeReputations(); 
//         //we have to register all the nodes present to the network to the one new node that we adding  
//         const bulkRegisterOptions = {
//             url: newNodeUrl + '/register-nodes-bulk',
//             method: 'POST',
//             body: {
//                 allNetworkNodes: [ ...tripChain.networkNodes, tripChain.currentNodeUrl],
//                 nodesReputation: allNodesReputation, // Including the node reputations here
//                 roles: roles,
//                 publicKey: publicKey,
//             },
//             json:true,
//         };
//         return rp(bulkRegisterOptions);
//     })
//     .then(data => {
//         // Broadcast the public and private keys to the new endpoint
//         const keyBroadcastPromises = [];
//         tripChain.networkNodes.forEach(networkNodeUrl => {
//             const keyBroadcastOptions = {
//                 url: networkNodeUrl + '/broadcast-travel-data',
//                 method: 'POST',
//                 body: {
//                     // newNodeUrl: newNodeUrl,
//                     publicKey: publicKey,
//                     privateKey: privateKey
//                 },
//                 json: true
//             };
//             keyBroadcastPromises.push(rp(keyBroadcastOptions));
//         });

//         return Promise.all(keyBroadcastPromises);
//     })
//     .then(data => {
//         res.json({ note: 'New node registered with network successfully .' });
//     })
//     .catch(error => {
//         res.status(500).json({ note: 'An error occurred', error: error.message });
//     });
// });
   
//     .then(data =>{
//         //just to send a response back to whoever called it
//         res.json({ note: 'New node registered with network successfully'});
//     })
// }
// );

app.post('/register-node', function(req, res) {
    const { newNodeUrl, newNodeReputation, roles , publicKey} = req.body;
    const nodeNotAlreadyPresent = tripChain.networkNodes.indexOf(newNodeUrl) === -1;
    const notCurrentNode = tripChain.currentNodeUrl !== newNodeUrl;

    if (nodeNotAlreadyPresent && notCurrentNode) {
        tripChain.networkNodes.push(newNodeUrl);
        reputationManager.updateNodeReputation(newNodeUrl, newNodeReputation, roles);
        res.json({ note: 'New node registered successfully.' });
    } else if (!notCurrentNode) {
        // It's an update to the current node
        tripChain.currentNodeReputation = newNodeReputation; // Update the current node's reputation
        reputationManager.updateNodeReputation(newNodeUrl, newNodeReputation, roles); // Ensure the reputation manager is also updated
        res.json({ note: 'Current node reputation updated successfully.' });
    } else {
        res.status(400).json({ note: 'Node is already registered.' });
    }
});

app.get('/Reset', function(req, res) {
    // Reset consensus variables
    consensusManager.validators = [];
    vote_first_round = [];
    global.leader = null;
    leaders = [];
    validatorsList = [];
    finalLeader = null;
    res.json({message: "Consensus reset."})
})

app.post('/reset-consensus', function(req, res) {
    // Reset consensus variables
    consensusManager.validators = [];
    vote_first_round = [];
    global.leader = null;
    leaders = [];
    validatorsList = [];
    finalLeader = null;

    // console.log('after-------------------');
    // console.log(consensusManager.validators);
    // console.log(vote_first_round);
    // console.log(leader);
    // console.log(leaders);
    // console.log(validatorsList);
    // console.log(finalLeader);

    // Prepare promises to call '/create-consensus-group' on each network node
    const createConsensusPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl + '/create-consensus-group',
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
                    uri: networkNodeUrl + '/vote-first-Round',
                    method: 'GET',
                    json: true,
                });
            });

            return Promise.all(selectTopValidatorsPromises);
        })
        .then(responses => {
            // Extract topValidators from each response
            vote_first_round = responses.map(response => response.topValidators);

            // Prepare promises to call '/potential-leader' on each network node
            const potentialLeaderPromises = tripChain.networkNodes.map(networkNodeUrl => {
                return rp({
                    uri: networkNodeUrl + '/leader',
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
                    uri: networkNodeUrl + '/receive-leader-and-vote-final-leader',
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

// let vote_first_round = [];
// let topValidators = [];
global.leader = null ;

// app.get('/create-consensus-group', function(req, res) {
//     if (tripChain.networkNodes.length === 0) {
//         return res.status(404).json({ error: "No nodes registered in the network." });
//     }
//     // Retrieve all node reputations for broadcasting
//     const allNodesReputation = reputationManager.getNodeReputations();
//     // console.log("nodesReputation:", allNodesReputation)

//     // Determine the consensus validators 
//     consensusManager.validators = consensusManager.getConsensusGroup(allNodesReputation);
//     // validatorsList = consensusManager.validators;
//     // Prepare promises for broadcasting validators
//     const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
//         return rp({
//             uri: networkNodeUrl + '/receive-validators',
//             method: 'POST',
//             body: { validators: consensusManager.validators,
//                 // consensusManager.validators,
//                 //originNode: networkNodeUrl  // Include the sender's URL as the originNode
//              },
//             json: true,
//         });
//     });

//     Promise.all(broadcastPromises)
//     .then(data => {
//         // Send the response once all broadcasts are successful 
//         res.json({
//             message: "Consensus group created and broadcasted successfully.",
//             validators: consensusManager.validators,
//         });
//     })
//     .catch(error => {
//         // Handle errors from promises
//         console.error('Error broadcasting validators', error);
//         res.status(500).json({ error: "Failed to broadcast validators" });
//     });
// });

// This endpoint accumulates received validators
// app.post('/receive-validators', function(req, res) {
//     const { validators } = req.body;
//     //console.log("validators:", validators);
//     vote_first_round.push(validators);
//     // validatorsList = consensusManager.receivedValidators;
//     //validatorsList = consensusManager.addValidators(validators);
//     console.log('please', vote_first_round);
     
//     res.status(200).json({ message: 'Validators received and stored.' });
// });

// // Endpoint to receive validators from other nodes
// app.post('/receive-validators', function(req, res) {
//     const { validators, originNode } = req.body;

//     if (!receivedValidators.some(entry => entry.originNode === originNode)) {
//         receivedValidators.push({
//             originNode: originNode,
//             validators: validators
//         });
//     }

//     console.log(`Received validators from ${originNode}: ${JSON.stringify(validators, null, 2)}`);
//     res.status(200).json({ message: 'Validators received and stored.' });
// });

// app.get('/select-top-validators', function(req, res) {
//     try {
//         //console.log("Accessing receivedValidators:", receivedValidators);
//         const topValidators = consensusManager.selectTopValidators(receivedValidators);
//         //console.log('validators in the network:', JSON.stringify(topValidators, null, 2));
//         res.json({
//             message: "Top two validators selected based on received data.",
//             topValidators: topValidators
//         });
//     } catch (error) {
//         console.error('Failed to compute top validators', error);
//         res.status(500).json({ error: "Failed to compute top validators" });
//     }
// });

// Endpoint to select the top two validators
// app.get('/vote-first-Round', function(req, res) {
//     console.log('vote_first_round: ', vote_first_round);
//     // Count occurrences of each nodeUrl in the vote_first_round array
//     const nodeCounts = vote_first_round.reduce((acc, validators) => {
//         validators.forEach(validator => {
//             const nodeUrl = validator.nodeUrl;
//             if (nodeUrl) { // Check if nodeUrl is defined
//                 if (acc[nodeUrl]) {
//                     acc[nodeUrl]++;
//                 } else {
//                     acc[nodeUrl] = 1;
//                 }
//             }
//         });
//         return acc;
//     }, {});

//     // Find the top two nodes with the highest counts
//     const sortedNodes = Object.keys(nodeCounts).sort((a, b) => nodeCounts[b] - nodeCounts[a]);
//     const topTwoNodes = sortedNodes.slice(0, 2);
    
//     console.log("Top two nodes with the most appearances:", topTwoNodes);
    
//     // Prepare promises for broadcasting the topTwoNodes
//     const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
//         return rp({
//             uri: networkNodeUrl + '/receive-top-two-nodes',
//             method: 'POST',
//             body: { topTwoNodes }, // Ensure topTwoNodes is sent correctly in the body
//             json: true,
//         });
//     });
//     // Execute all broadcast promises
//     Promise.all(broadcastPromises)
//     .then(responses => {
//         res.json({ note: 'All top two nodes broadcasted successfully.' });
//     })
//     .catch(error => {
//         // Respond with error message
//         res.status(500).json({ error: 'Error broadcasting top two nodes.' });
//     });

    
// });

// // Endpoint to receive top two nodes
// app.post('/receive-top-two-nodes', function(req, res) {
//     const { topTwoNodes } = req.body;

//     // Here you can process the received topTwoNodes data as needed
//     console.log('Received top two nodes:', topTwoNodes);

//     // Respond with a success message
//     res.status(200).json({ message: 'Top two nodes received and processed successfully.' });
// });

// app.get('/vote-first-Round', function(req, res) {
//     console.log('vote_first_round: ',vote_first_round)
//     // Count occurrences of each node in the validatorsList array
//     const nodeCounts = vote_first_round.reduce((acc, validators) => {
//         validators.forEach(validator => {
//             if (acc[validator.node]) {
//                 acc[validator.node]++;
//             } else {
//                 acc[validator.node] = 1;
//             }
//         });
//         return acc;
//     }, {});

//     // Find the two nodes with the highest counts
//     const sortedNodes = Object.keys(nodeCounts).sort((a, b) => nodeCounts[b] - nodeCounts[a]);

//     const topTwoNodes = sortedNodes.slice(0, 2);

//     console.log('Top two nodes with the most appearances:', topTwoNodes);

//     // Now you have the top two nodes that appeared the most, you can use them as needed

//     res.status(200).json({ message: 'Top two nodes with the most appearances selected.', topTwoNodes });

//     // Prepare the payload to be broadcasted
//     const broadcastPayload = {
//         topTwoNodes: topTwoNodes
//     };

//     // Prepare promises for broadcasting the topTwoNodes
//     const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
//         return rp({
//             uri: networkNodeUrl + '/receive-top-two-nodes',
//             method: 'POST',
//             body: broadcastPayload,
//             json: true,
//         });
//     });

//     // Execute all broadcast promises
//     Promise.all(broadcastPromises)
//     .then(data => {
//         res.status(200).json({ message: 'Top two nodes broadcasted successfully.' });
//     })
//     .catch(error => {
//         console.error('Error broadcasting top two nodes:', error);
//         res.status(500).json({ error: "Failed to broadcast top two nodes." });
//     });
//     // const infos = reputationManager.getNodeReputations();
//     // console.log('infos : ',infos);
//     // topValidators = consensusManager.selectTopValidators(infos);
//     // console.log('topValidators :',topValidators);
//     // topValidators.forEach(validator => {
//     //     vote_first_round.push({
//     //         validator: validator // Assuming validators are identified by 'nodeUrl'
//     //     });
//     // });
//     // console.log('validators in the network:', JSON.stringify(vote_first_round, null, 2));
//     // res.json({
//     //     message: "Top two validators selected based on received data.",
//     //     topValidators: topValidators
//     // });
// });

// app.get('/get-received-validators', function(req, res) {
//     res.json({
//         count: receivedValidators.length,
//         receivedValidators: receivedValidators
//     });
// });
// app.post('/receive-top-two-nodes', function(req, res) {
//     const { topTwoNodes } = req.body;

//     // Here you can process the received topTwoNodes data as needed
//     console.log('Received top two nodes:', topTwoNodes);

//     // Respond with a success message
//     res.status(200).json({ message: 'Top two nodes received and processed successfully.' });
// });

// Endpoint to create consensus group and broadcast validators

const { performance } = require('perf_hooks');
const os = require('os');

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
    vote_first_round.push(consensusManager.validators);
    // console.log('validators choosen by the current node: ',vote_first_round)
    // Prepare promises for broadcasting validators
    const broadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
        return rp({
            uri: networkNodeUrl + '/receive-validators',
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
            uri: networkNodeUrl + '/receive-top-two-nodes',
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
            uri: networkNodeUrl + '/broadcast-leader',
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
                uri: networkNodeUrl + '/receive-leader-and-vote-final-leader',
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

app.get('/mine', function(req, res){
    // Start measuring execution time
    const startExecution = performance.now();

    // Start measuring CPU usage
    const startCPUUsage = process.cpuUsage();
   //console.log('leader reputation = ', global.leader.nodeUrl);
   // console.log('leaderUrl = ', tripChain.currentNodeUrl);
   if(tripChain.currentNodeUrl !== global.leader.nodeUrl) {
       return res.json({ note: "This node is not the leader and cannot mine new blocks." });
   }
   
   const lastBlock = tripChain.getLastBlock();
   const previousBlockHash = lastBlock['hash'];

   // Validate transactions: both signature and contract existence
   const validTransactions = tripChain.pendingTransactions.filter(tx => {
   const isSignatureValid = consensusManager.verifyTransactionSignature(tx.newTransaction, tx.signature, tx.publicKey);
   //const contractExists = tx.newTransaction.contractId ? bitcoin.smartContracts.some(contract => contract.id === tx.newTransaction.contractId) : true;
   return isSignatureValid ;
   //&& contractExists
});
   
   const currentBlockData = {
       transactions: validTransactions,
       index: lastBlock['index'] + 1
   };
   
   const blockHash = tripChain.hashBlock(previousBlockHash, currentBlockData);
   // const newBlock = tripChain.createNewBlock(previousBlockHash, blockHash, validTransactions);
   const newBlock = tripChain.createNewBlock(
       previousBlockHash,
       blockHash,
       false, // This is not a genesis block
       tripChain.currentNodeUrl, // URL of the node creating this block, assumed to be the leader
       global.leader.reputationScore // Reputation of the leader
   );
   //console.log("new block=",newBlock);
   const voteRequests = tripChain.networkNodes.map(networkNodeUrl => {
       return rp({
           url: networkNodeUrl + '/verify-and-vote',
           method: 'POST',
           body: { newBlock: newBlock },
           json: true
       });
   });

   Promise.all(voteRequests)
   .then(votes => {
       const yesVotes = votes.filter(vote => vote.vote === 'yes').length;
       const noVotes = votes.filter(vote => vote.vote === 'no').length;
       console.log('vote yes =', yesVotes);
       console.log('votes No =', noVotes);
       if (yesVotes >= noVotes) {
           if (!tripChain.chain.some(block => block.hash === newBlock.hash)) {
               tripChain.chain.push(newBlock);
               tripChain.pendingTransactions = []; // Clear the pending transactions
           }
           const newReputation = global.leader.reputationScore + 1;
           //console.log('old reputation of the leader:',finalLeader.leader.reputationScore);
           //console.log('new reputation of the leader: ', newReputation );
           consensusManager.nodesReputations = reputationManager.updateNodeReputation(tripChain.currentNodeUrl, 
               newReputation, global.leader.role);
           tripChain.currentNodeReputation = newReputation;
           return newReputation ;
       } else {
           const newReputation = global.leader.reputationScore - 1;
            //console.log('old reputation of the leader:',finalLeader.leader.reputationScore);
           //console.log('new reputation of the leader: ', newReputation );
           consensusManager.nodesReputations = reputationManager.updateNodeReputation(tripChain.currentNodeUrl, 
               newReputation, global.leader.role);
           tripChain.currentNodeReputation = newReputation;
           // return newReputation ;
             // Call the reset consensus endpoint if noVotes > yesVotes
             return rp({
               uri: tripChain.currentNodeUrl + '/reset-consensus',
               method: 'POST',
               json: true
           }).then(() => {
               throw new Error("The block didn't receive enough votes, consensus has been reset.");
           });
       }
   })
   .then(newReputation => {
       // Broadcast the new reputation
       const reputationBroadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
           return rp({
               uri: networkNodeUrl + '/update-reputation',
               method: 'POST',
               body: {
                   leaderUrl: tripChain.currentNodeUrl,
                   newReputation: newReputation,
                   //role: leader.role
               },
               json: true
           });
       });

       return Promise.all(reputationBroadcastPromises);
   })
   .then(data => {
       // Broadcast the new block to all nodes
       const blockBroadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
       return rp({
           uri: networkNodeUrl + '/receive-new-block',
           method: 'POST',
           body: { newBlock: newBlock },
           json: true
       });
   });

   return Promise.all(blockBroadcastPromises);
   }
   )
   .then(data => {
        // Stop measuring execution time
        const endExecution = performance.now();

        // Stop measuring CPU usage
        const endCPUUsage = process.cpuUsage(startCPUUsage);

        // Calculate execution time
        const executionTime = endExecution - startExecution;

        // Get CPU usage
        const cpuUsage = (endCPUUsage.user + endCPUUsage.system) / 1000;
               res.json({ note: "Block mining, reputation update, and verification completed successfully.",
               executionTime: executionTime + " ms",
               cpuUsage: cpuUsage + " ms"
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
       console.error("There was an error during the mining process.", error);
       res.status(500).json({
           note: "There was an error during the mining process.",
           error: error.message ,
           executionTime: executionTime + " ms",
           cpuUsage: cpuUsage + " ms"
       });
   });
 });

       // if (yesVotes <= noVotes) {
       //     return Promise.reject("The block didn't receive enough votes.");
       // }

       // if (!bitcoin.chain.some(block => block.hash === newBlock.hash)) {
       //     tripChain.chain.push(newBlock);
       //     tripChain.pendingTransactions = [];
       // }
       // Check if the block received more 'yes' votes than 'no' votes

       // if (yesVotes > noVotes) {
       //     // Only add the new block if it doesn't already exist in the blockchain
       //     consonle.log("you have to add the new block to the blockchain.");
       //     if (!bitcoin.chain.some(block => block.hash === newBlock.hash)) {
       //         tripChain.chain.push(newBlock);
       //         tripChain.pendingTransactions = [];  // Clear the pending transactions as they are now confirmed
       //     }
       //     consonle.log("Block successfully added to the blockchain.");
       //     res.json({ note: "Block successfully added to the blockchain." });
       // } else {
       //     // Handle case where not enough votes were received
       //     return Promise.reject("The block didn't receive enough votes.");
       // }

   //     const newReputation = consensusManager.rewardLeader(); // Assume this updates the leader's reputation score internally
   //     console.log('old reputation of the leader:',finalLeader.reputationScore);
   //     finalLeader.reputationScore = newReputation;
   //     console.log('new reputation of the leader: ',finalLeader.reputationScore );

   //     // Broadcasting the updated reputation score
   //     const reputationBroadcastPromises = tripChain.networkNodes.map(networkNodeUrl => {
   //         return rp({
   //             uri: networkNodeUrl + '/update-reputation',
   //             method: 'POST',
   //             body: {
   //                 leaderUrl: consensusManager.leader.nodeUrl, 
   //                 newReputation: newReputation
   //             },
   //             json: true
   //         });
   //     });

   //     return Promise.all(reputationBroadcastPromises)
   // })
   // .then(consensusResult => {
   //     const validators = consensusResult.validators;
   //     const leader = consensusResult.leader;

   //     // Further broadcasting steps, if necessary
   //     return Promise.all([
   //         ...tripChain.networkNodes.map(networkNodeUrl => {
   //             return rp({
   //                 uri: `${networkNodeUrl}/update-consensus-info`,
   //                 method: 'POST',
   //                 body: {
   //                     validators: validators,
   //                     leader: leader
   //                 },
   //                 json: true
   //             });
   //         }),
   //         ...tripChain.networkNodes.map(networkNodeUrl => {
   //             return rp({
   //                 uri: `${networkNodeUrl}/receive-new-block`,
   //                 method: 'POST',
   //                 body: { newBlock: newBlock },
   //                 json: true
   //             });
   //         })
   //     ]);
//      })
//     .then(() => {
//         res.json({ note: "Block mining, reputation update, and verification completed successfully." });
//     })
//     .catch(error => {
//         res.json({
//             note: "There was an error during the mining process.",
//             error: error
//         });
//     });
// });


// app.get('/announce-final-leader', function(req, res) {
//     //console.log('Current leaders:', JSON.stringify(leaders, null, 2));

//     if (leaders.length === 0) {
//         return res.status(404).json({ error: "No leader data available." });
//     }

//     // Count each leader's appearances
//     const leaderCounts = leaders.reduce((acc, leader) => {
//         const Leader = leader;
//         //console.log(`Processing leader URL: ${JSON.stringify(Leader, null, 2)}`);
//         acc[Leader] = (acc[Leader] || 0) + 1;
//         return acc;
//     }, {});

//     //console.log('Leader counts:', leaderCounts);

//     // Find the leader with the maximum count
//     const finalLeader = Object.entries(leaderCounts).reduce((max, entry) => {
//         //console.log(`Entry: ${entry[0]}, Count: ${entry[1]}`);
//         return entry[1] > max.count ? { leader: entry[0], count: entry[1] } : max;
//     }, { leader: null, count: 0 });

//     // Respond with the final leader
//     res.json({
//         message: "Final leader determined based on the highest number of appearances.",
//         finalLeader: {
//             nodeUrl: finalLeader.leader,
//             count: finalLeader.count
//         }
//     });
// });

// app.post('/announce-final-leader', function(req, res) {
//     if (leaders.length === 0) {
//         return res.status(404).json({ error: "No leader data available." });
//     }

//     // Count each leader's appearances
//     const leaderCounts = leaders.reduce((acc, leader) => {
//         const leaderKey = JSON.stringify(leader);  // Convert leader object to a string to use as a key
//         acc[leaderKey] = (acc[leaderKey] || 0) + 1;
//         return acc;
//     }, {});

//     // Find the leader with the maximum count, and highest reputation in case of a tie
//     const finalLeader = Object.entries(leaderCounts).reduce((max, [leaderString, count]) => {
//         const leader = JSON.parse(leaderString);  // Parse the string back to an object
//         // Include count in the leader object and compare reputationScore in case of count tie
//         if (count > max.count || (count === max.count && leader.reputationScore > max.reputationScore)) {
//             return { ...leader, count: count };  // Flatten the structure to include count directly
//         }
//         return max;
//     }, { reputationScore: -1, count: 0 }); // Set initial max object with count and low reputationScore

//     // Set the global finalLeader (optional, only if you need it outside this scope)
//     global.finalLeader = finalLeader;

//     // Respond with the final leader
//     if (!finalLeader || finalLeader.reputationScore === -1) {
//         return res.status(404).json({ error: "No valid leader found." });
//     }

//     res.json({
//         message: "Final leader determined based on the highest number of appearances, with ties broken by reputation score.",
//         finalLeader: finalLeader, // This should now directly return the leader object in the desired format
//     });
// });


// app.get('/announce-final-leader', function(req, res) {
//     console.log('Current leaders:', leaders);

//     if (leaders.length === 0) {
//         return res.status(404).json({ error: "No leader data available." });
//     }

//     // Count each leader's appearances
//     const leaderCounts = leaders.reduce((acc, leader) => {
//         const leaderUrl = leader.leader;  // Make sure this is the correct property
//         acc[leaderUrl] = (acc[leaderUrl] || 0) + 1;
//         return acc;
//     }, {});

//     // Find the leader with the maximum count
//     const finalLeader = Object.entries(leaderCounts).reduce((max, entry) => {
//         return entry[1] > max.count ? { leader: entry[0], count: entry[1] } : max;
//     }, { leader: null, count: 0 });

//     console.log('Final Leader:', finalLeader);

//     // Respond with the final leader
//     res.json({
//         message: "Final leader determined based on the highest number of appearances.",
//         finalLeader: {
//             nodeUrl: finalLeader.leader,
//             count: finalLeader.count
//         }
//     });
// });

// app.post('/register-node', function(req, res){
//     const { newNodeUrl, newNodeReputation, role } = req.body;
//     const nodeAlreadyPresent = tripChain.networkNodes.includes(newNodeUrl);

//     if (!nodeAlreadyPresent) {
//         tripChain.networkNodes.push(newNodeUrl);
//         reputationManager.updateNodeReputation(newNodeUrl, newNodeReputation, role);
//         res.json({ note: 'New node registered successfully.' });
//     } else {
//         //Node is already registered, consider sending a different response or handling differently
//         res.status(200).json({ note: 'Node is already registered. No action needed.' });
//     }
// });

// app.post('/update-consensus-info', function (req, res) {
//     console.log("Received update-consensus-info with:", req.body.validators);
//     const { validators, leader } = req.body;
    
//     console.log("Current validators before update:", bitcoin.validators);
//     consensusManager.validators = validators;
//     console.log("Updated validators:", bitcoin.validators);
    
//     consensusManager.leader = leader;
//     res.json({ note: 'Consensus information updated successfully.' });
// });




// app.post('/register-nodes-bulk', function(req, res){
//     const { allNetworkNodes, roles } = req.body;
//     const defaultReputation = 10;  // Set the default reputation score

//     // Read existing nodes from nodes.json file
//     fs.readFile('./nodes.json', (err, data) => {
//         if (err) {
//             console.error('Error reading nodes file:', err);
//             res.status(500).json({ note: 'Error reading nodes file.' });
//             return;
//         }

//         try {
//             const existingNodes = JSON.parse(data);
//             // Add existing nodes to networkNodes array
//             existingNodes.forEach(node => {
//                 if (tripChain.networkNodes.indexOf(node.url) === -1) {
//                     tripChain.networkNodes.push(node.url);
//                 }
//             });

//             // Register new nodes from the bulk request
//             allNetworkNodes.forEach(networkNodeUrl => {
//                 const nodeNotAlreadyPresent = tripChain.networkNodes.indexOf(networkNodeUrl) === -1;
//                 const notCurrentNode = tripChain.currentNodeUrl !== networkNodeUrl;
                
//                 if (nodeNotAlreadyPresent && notCurrentNode) {
//                     tripChain.networkNodes.push(networkNodeUrl);
//                     // Set default reputation for each node
//                     reputationManager.updateNodeReputation(networkNodeUrl, defaultReputation, roles);  // Assuming a 'default_role' or adjust as necessary
//                 }
//             });

//             res.json({ note: 'Bulk registration successful, all nodes set with default reputation.' });
//         } catch (parseError) {
//             console.error('Error parsing JSON from nodes file:', parseError);
//             res.status(500).json({ note: 'Error parsing nodes file.' });
//         }
//     });
// });

// Register multiple nodes at once with the network
app.post('/register-nodes-bulk', function(req, res){
    // const { allNetworkNodes, validators, leader } = req.body;
    const { allNetworkNodes ,roles} = req.body;
    const defaultReputation = 10;  // Set the default reputation score

    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = tripChain.networkNodes.indexOf(networkNodeUrl) === -1;
        const notCurrentNode = tripChain.currentNodeUrl !== networkNodeUrl;
        
        if (nodeNotAlreadyPresent && notCurrentNode) {
            tripChain.networkNodes.push(networkNodeUrl);
            // Set default reputation for each node
            reputationManager.updateNodeReputation(networkNodeUrl, defaultReputation, roles);  // Assuming a 'default_role' or adjust as necessary
        }
    });

    // // Update validators locally after receiving bulk update
    // consensusManager.validators = validators;
    // consensusManager.leader = leader;
    res.json({ note: 'Bulk registration successful, all nodes set with default reputation.' });
});

// app.get('/consensus-info', function(req, res) {
//     if (!consensusManager.validators || !consensusManager.leader) {
//         return res.status(404).json({ message: "No consensus information available." });
//     }

//     res.json({
//         message: "Current consensus information",
//         validators: consensusManager.validators.map(v => ({
//             url: v.nodeUrl,
//             reputation: v.reputationScore,
//             isLeader: v.nodeUrl === consensusManager.leader.nodeUrl
//         })),
//         leader: {
//             url: consensusManager.leader.nodeUrl,
//             reputation: consensusManager.leader.reputationScore
//         }
//     });
// });

// When sending node data to clients
app.get('/node-reputations', function(req, res) {
    res.json(reputationManager.nodesReputations);
});

app.get('/warning', function (req, res) {
    const requestPromises = [] ;
    tripChain.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions = {
            url: networkNodeUrl+ '/blockchain',
            method: 'GET',
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
    //blockchains is an array that filled up by all the other blockchains that are hosted across all the other nodes on the network
    .then(blockchains =>{
        const currentChainLength = bitcoin.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null ;
        let newPendingTransactions = null ;

        blockchains.forEach(blockchain =>{
            //identify if one of the blockhains is longer than the one on the current node
            if ( blockchain.chain.length > maxChainLength){
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain ;
                newPendingTransactions = blockchain.pendingTransactions;
            };
        });
        
        if (!newLongestChain || (newLongestChain && !tripChain.chainIsValid(newLongestChain))){
            res.json({ 
                note: 'Current chain has not been replaced.',
                chain: tripChain.chain
        });
        }
        //else if( newLongestChain && bitcoin.chainIsValid(newLongestChain))
        else{
            warningCount = warningCount + 1;
            let warning = warningCount;
            if (warning == 1) {
                res.json({note: 'Warning' + warning + 'received',
                info:'You got first warning'
                });
            }else if (warning == 2) {
                const newRep = consensusManager.decrementLeaderReputation();
                res.json({note: 'Warning' + warning + 'received',
                info:'Second warning, your reputation is decremented -10%,'})
                const requestPromises = [] ;
                tripChain.networkNodes.forEach(networkNodeUrl =>{
                    const requestOptions = {
                        url: networkNodeUrl+ '/update-reputation',
                        body: newRep,
                        method: 'POST',
                        json: true
                    };
            
                    requestPromises.push(rp(requestOptions));
                });
            
                Promise.all(requestPromises)

            }
            else if (warning == 3){
                const requestPromises = [] ;
                tripChain.networkNodes.forEach(networkNodeUrl =>{
                const requestOptions = {
                    url: networkNodeUrl+ '/remove-node',
                    method: 'POST',
                    body: { node: tripChain.currentNodeUrl },
                    json: true ,
                };

        requestPromises.push(rp(requestOptions))
        Promise.all(requestPromises)
        .then((data) => {
            res.json({ note: 'Warning ' + warning + 'received !',
            info: 'You are BANNED from the network !', });
            });
    });

    Promise.all(requestPromises)
    

            }
            
        }
    })
});

app.post('/remove-node', function(req, res) {
    const nodeToRemoveUrl = req.body.nodeUrl;

    // Remove the node from the networkNodes array
    const nodeIndex = tripChain.networkNodes.indexOf(nodeToRemoveUrl);
    if (nodeIndex > -1) {
        tripChain.networkNodes.splice(nodeIndex, 1);
    }

    // Optionally, remove the node from the nodesReputations array
    const reputationIndex = reputationManager.nodesReputations.findIndex(rep => rep.nodeUrl === nodeToRemoveUrl);
    if (reputationIndex > -1) {
        reputationManager.nodesReputations.splice(reputationIndex, 1);
    }

    // Optionally, remove the node from the validators array if it is a validator
    const validatorIndex = consensusManager.validators.findIndex(val => val.nodeUrl === nodeToRemoveUrl);
    if (validatorIndex > -1) {
        consensusManager.validators.splice(validatorIndex, 1);
    }

    // Optionally, if the node to remove is the current leader, reset the leader
    if (consensusManager.leader && consensusManager.leader.nodeUrl === nodeToRemoveUrl) {
        bitcoin.leader = null;
        // You might want to select a new leader here or wait for a new consensus round
        // For example:
        consensusManager.resetAndSelectLeader();
    }

    res.json({ note: `Node ${nodeToRemoveUrl} removed successfully.` });
});

app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});

