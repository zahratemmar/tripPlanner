const fetchUserAndTravelData = require('./fetchUserAndTravelData');
const SmartContractManager = require('./SmartContractManager');
const NetworkHelpers = require('./networkHelpers');
const tripContract = require('./TravelContract');
const consensus = require('./consensus');
//const Reputation = require('./Reputation');
const consensusManager = new consensus();
const contract= new tripContract();

const fs = require('fs');
const path = require('path');
const sha256 = require('sha256');
const currentNodeUrl = process.argv[3]; 
const { v4: uuidv4 } = require('uuid');

function blockchain(){
    this.chain= [];
    this.pendingTransactions = [];
    this.currentNodeUrl = currentNodeUrl;
    this.currentNodeReputation = 0; 
    this.currentNodeRoles = null;
    //aware of all the other node that inside of our network
    this.networkNodes = [];
    // this.smartContractManager = new SmartContractManager();
    this.createNewBlock('0' , '0', true, null, null);
    // this.smartContractManager.createAndStoreTravelContracts ();
    //this.networkHelpers = new NetworkHelpers();
}

blockchain.prototype.getCurrentNodeInfo = function() {
    // Assuming this.currentNodeReputation is an array of reputation scores of all nodes in the network
    const normalizedReputation = consensusManager.minMaxNorm(this.currentNodeReputation);
    const weights = consensusManager.calculateWeights(normalizedReputation);
    return {
        currentNodeUrl: this.currentNodeUrl,
        currentNodeReputation: this.currentNodeReputation ,
        currentNodeWeights: weights 
    };
};

blockchain.prototype.executePHP = function(callback) {
    const networkHelpers = new NetworkHelpers();
    networkHelpers.executePHP(callback);
};

blockchain.prototype.executeToJson = function(callback) {
    const networkHelpers = new NetworkHelpers();
    networkHelpers.executeToJson(callback);
};

// Function to fetch and process JSON data
blockchain.prototype.fetchTravelData = function(callback) {
    const jsonFilePath = path.join(__dirname, 'dev\\organized_trip_data\\travel.json');
    console.log(jsonFilePath);
    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Failed to read travel data from JSON file:", err);
            callback(err, null);
            return;
        }
        try {
            const travelData = JSON.parse(data);
            console.log('Travel data loaded:', travelData);
            callback(null, travelData);
        } catch (parseErr) {
            console.error("Error parsing JSON data from file:", parseErr);
            callback(parseErr, null);
        }
    });
};

blockchain.prototype.createNewBlock = function(previousBlockHash, hash, isGenesis = false, creatorNodeUrl, creatorReputation) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        // contracts:  this.smartContractManager.getAllContracts(), // Correctly access contracts via smartContractManager
        hash: hash,
        previousBlockHash: previousBlockHash,
        creatorNodeUrl: isGenesis ? null : creatorNodeUrl,
        creatorReputation: isGenesis ? null : creatorReputation // Include the current node's reputation
    };

    this.pendingTransactions = [];
    // this.smartContractManager.smartContracts = [];
    this.chain.push(newBlock);

    return newBlock;
};

// blockchain.prototype.readBlockAndProcessContracts = function(block) {
//     // Check if the current node is the creator of the block
//     if (block.creatorNodeUrl === this.currentNodeUrl) {
//         console.log("This block was created by this node. Processing smart contracts...");

//         block.contracts.forEach(contract => {
//             // Assuming contract is an instance of TravelContract
//             contract.distributePayments();
//         });
//     } else {
//         console.log("This block was not created by this node.");
//     }
// };

// Add the new method here
// blockchain.prototype.readAllBlocks = function() {
//     //console.log("block.creatorNodeUrl= ", this.currentNodeUrl);
//     this.chain.forEach(block => {
//         //console.log("block.creatorNodeUrl= ", block.creatorNodeUrl);
//         if (block.creatorNodeUrl === this.currentNodeUrl) {
//             console.log(`This specific block (index: ${block.index}) was created by this node.`);
//             console.log('the smart contract is executed by this node: ',currentNodeUrl);
//             contract.distributePayments();
//         }
//     });
// };

blockchain.prototype.getLastBlock = function(){
    return this.chain[this.chain.length -1 ];
};

// Prototype method to create a new transaction
blockchain.prototype.createNewTransaction = function(id_user) {
    return new Promise((resolve, reject) => {
        fetchUserAndTravelData(id_user, (err, userTravelData) => {
            if (err) {
                console.error('Error fetching data:', err);
                reject(err);
                return;
            }

            if (userTravelData.length === 0) {
                console.log('No travels found for the given user ID.');
                resolve([]); // Return an empty array if no travels are found
                return;
            }

            const transactions = userTravelData.map(data => ({
                idUser: data.id_user,            // Include the user ID
                userFullName: data.userFullName, // Include the full name of the user
                travelId: data.travelId,
                visitId: data.visitId,
                vehicleId: data.vehicleId,
                houseId: data.houseId,
                totalPrice: data.totalPrice,
                placeAvailable: data.placeAvailable,
                startDate: data.startDate,
                endDate: data.endDate,
                startingLocation: data.startingLocation,
                destination: data.destination,
                num_credit: data.num_credit,
                transactionId: uuidv4().replace(/-/g, '')
            }));

            resolve(transactions); // Resolve the promise with the array of constructed transactions
        });
    });
};

blockchain.prototype.validateTransaction = function(transaction, callback) {
    const jsonFilePath = path.join(__dirname, './organized_trip_data/travel.json');
    console.log("pathTransaction: ",jsonFilePath)

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Failed to read travel data from JSON file:", err);
            callback(err, false);
            return;
        }

        try {
            const travels = JSON.parse(data);
            const isValid = travels.some(travel => {
                // Create Date objects for comparison, focusing on year, month, day
                const jsonStartDate = new Date(travel.start_date);
                const jsonEndDate = new Date(travel.end_date);
                const transactionStartDate = new Date(transaction.startDate);
                const transactionEndDate = new Date(transaction.endDate);

                return travel.id === transaction.travelId &&
                       travel.id_visit === transaction.visitId &&
                       travel.id_vehicle === transaction.vehicleId && // Corrected the typo here
                       travel.id_house === transaction.houseId &&
                       travel.total_price === transaction.totalPrice &&
                       travel.nbr_places === transaction.placeAvailable &&
                       jsonStartDate.toDateString() === transactionStartDate.toDateString() &&
                       jsonEndDate.toDateString() === transactionEndDate.toDateString() &&
                       travel.starting_location === transaction.startingLocation &&
                       travel.destination === transaction.destination;
            });

            if (isValid) {
                console.log("Transaction validated successfully:", transaction);
            } else {
                console.log("No matching travel found for transaction:", transaction);
                console.log("Available travels:", travels);
            }

            callback(null, isValid);
        } catch (parseErr) {
            console.error("Error parsing JSON data from file:", parseErr);
            callback(parseErr, false);
        }
    });
};

const dbConnection = require('./dbConnection');

// Function to decrement the number of places
blockchain.prototype.decrementPlaces = function(travelId, nbrPlaces) {
    const jsonFilePath = path.join(__dirname, './organized_trip_data/travel.json');
    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Failed to read travel data from JSON file:", err);
            return;
        }
        let travels = JSON.parse(data);
        const travelIndex = travels.findIndex(travel => travel.id === travelId);
        if (travelIndex !== -1) {
            const currentPlaces = travels[travelIndex].nbr_places;
            if (currentPlaces >= nbrPlaces) {
                travels[travelIndex].nbr_places -= nbrPlaces; // Decrement the nbr_places by nbrPlaces entered
                fs.writeFile(jsonFilePath, JSON.stringify(travels, null, 4), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error("Failed to update travel data file:", writeErr);
                    }
                });
            } else {
                console.error("Not enough places available to decrement");
            }
        }
    });

    // Update the database
    const selectQuery = 'SELECT nbr_places FROM travel WHERE id = ?';
    dbConnection.query(selectQuery, [travelId], (selectErr, results) => {
        if (selectErr) {
            console.error("Failed to retrieve travel data from the database:", selectErr);
            return;
        }
        if (results.length > 0) {
            const currentPlaces = results[0].nbr_places;
            if (currentPlaces >= nbrPlaces) {
                const updateQuery = 'UPDATE travel SET nbr_places = nbr_places - ? WHERE id = ?';
                dbConnection.query(updateQuery, [nbrPlaces, travelId], (updateErr, updateResults) => {
                    if (updateErr) {
                        console.error("Failed to update travel data in the database:", updateErr);
                        return;
                    }
                    console.log("Successfully decremented the number of places in the database");
                });
            } else {
                console.error("Not enough places available in the database to decrement");
            }
        } else {
            console.error("Travel ID not found in the database");
        }
    });
};
//         if (travelIndex !== -1) {
//             travels[travelIndex].nbr_places -= nbrPlaces; // Decrement the nbr_places by nbrPlaces entered
//             fs.writeFile(jsonFilePath, JSON.stringify(travels, null, 4), 'utf8', (writeErr) => {
//                 if (writeErr) {
//                     console.error("Failed to update travel data file:", writeErr);
//                 }
//             });
//         }
//     });

//      // Update the database
//      const query = 'UPDATE travel SET nbr_places = nbr_places - ? WHERE id = ?';
//      dbConnection.query(query, [nbrPlaces, travelId], (dbErr, results) => {
//          if (dbErr) {
//              console.error("Failed to update travel data in the database:", dbErr);
//              return;
//          }
//          console.log("Successfully decremented the number of places in the database");
//      });
// }

blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj){
    this.pendingTransactions.push(transactionObj);
    return {
        nextBlockIndex: this.getLastBlock()['index'] + 1,
        pendingTransactions: this.pendingTransactions
    };
};

blockchain.prototype.hashBlock= function(previousBlockHash, currentBlockData){
    const dataAsString= previousBlockHash + JSON.stringify(currentBlockData) ;
    //currentBlockData will be either an array or an object (JSON form)
    // stringfy turn into a string
    // dataAsString is a data string concatenated into a single string
    //create a hash with sha256
    const hash = sha256(dataAsString);
    return hash;
};

module.exports = blockchain;
