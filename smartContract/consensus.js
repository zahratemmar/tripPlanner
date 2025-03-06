const crypto = require('crypto');

function consensus(){
    this.validators = [];
    this.receivedValidators = [];
    this.leaders = [];
    this.leaderVotes = {};
    this.leader = null;
    this.warningCount = 0;
    this.nodesReputations = []; // Make sure this is initialized correctly
}


consensus.prototype.verifyTransactionSignature = function(transaction, signature, publicKey) {
    if (!transaction || !signature || !publicKey) {
        console.error("Invalid input: ", {transaction, signature, publicKey});
        return false;
    }
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(transaction));
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
};

consensus.prototype.minMaxNorm = function(scores) {
    if (!scores.length) return [];
    const maxScore = Math.max(...scores);
    //console.log('maxScore',maxScore)
    const minScore = Math.min(...scores);
    //console.log('minScore',minScore)

    // Check if the range is zero
    if (maxScore === minScore) {
        // Return an array of 1s (or 0s, depending on your normalization needs)
        return scores.map(() => 1);
    }
    //console.log('scores',scores)
    const normalizedScores = scores.map(score => (score - minScore) / (maxScore - minScore));
    //console.log('normalizedScores',normalizedScores)
    return normalizedScores;
};

consensus.prototype.calculateWeights = function(normalizedScores) {
    const total = normalizedScores.reduce((sum, score) => sum + score, 0);
    //console.log("total:",total);
    const weights = normalizedScores.map(score => score / total);
    return weights;
};

consensus.prototype.shuffleNodes = function(nodes) {
    for (let i = nodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        //console.log("j",j);
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]]; // Swap elements
        //console.log([nodes[i], nodes[j]]);
    }
    return nodes;
};

// Adjusted weightedRandomChoice to directly return the selected item's identifier
consensus.prototype.weightedRandomChoice = function(candidates, weights) {
    let sum = 0;
    const r = Math.random();
    const cumulativeWeights = weights.map((weight) => (sum += weight));
    sum = 0; // Reset for accumulation
    const randomThreshold = r * cumulativeWeights[cumulativeWeights.length - 1];

    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (cumulativeWeights[i] >= randomThreshold) {
            return candidates[i];
        }
    }
    //console.log(candidates[0]);
    return candidates[0]; // Fallback, should not reach here if weights are normalized correctly
};

consensus.prototype.getConsensusGroup = function(reputations) {
    //const reputations = this.nodesReputations; // Assume this is an array of node reputations
    const scores = reputations.map(rep => rep.reputationScore);
    //console.log("scores:",scores)
    const normalizedScores = this.minMaxNorm(scores);
    //console.log("NormalizedScores:",normalizedScores);
    const weights = this.calculateWeights(normalizedScores);
    //console.log("weights:",weights);
    const candidates = []; // To hold the selected candidates
    let availableCandidates = reputations.map((rep, index) => ({ ...rep, weight: weights[index] }));
    //console.log("availableCandidates:",availableCandidates)
    // Shuffle availableCandidates to ensure variability
    availableCandidates = this.shuffleNodes(availableCandidates);
    //console.log("availableCandidates2:",availableCandidates)
    for (let i = 0; i < 2; i++) { // Adjust '2' based on desired size of the consensus group
        const selectedCandidateUrl = this.weightedRandomChoice(availableCandidates.map(c => c.nodeUrl), availableCandidates.map(c => c.weight));
        //console.log("selectedCandidateUrl:",selectedCandidateUrl)
        const selectedCandidate = availableCandidates.find(candidate => candidate.nodeUrl === selectedCandidateUrl);
        //console.log("selectedCandidate:",selectedCandidate)
        candidates.push(selectedCandidate);
        //console.log("candidates:",candidates)
        // Remove the selected candidate to avoid re-selection
        availableCandidates = availableCandidates.filter(candidate => candidate.nodeUrl !== selectedCandidateUrl);
        //console.log("availableCandidates3:",availableCandidates)
    }

    this.validators = candidates; // Update validators based on new selection
    //console.log("validators:",candidates)
    //this.addValidators(candidates);
    //console.log(selectedCandidate);
    return candidates;
};

 // Add validators to the receivedValidators array
// consensus.prototype.addValidators = function(validators) {
//     validators.forEach(validator => {
//         this.receivedValidators.push({
//             validator: validator.nodeUrl // Assuming validators are identified by 'nodeUrl'
//         });
//     });
//     //console.log(`Validators added: ${JSON.stringify(validators, null, 2)}`);
// };

consensus.prototype.selectTopValidators = function(infos) {
    // First, calculate the number of votes each validator received
    const validatorCounts = {};
    this.receivedValidators.forEach(entry => {
        const nodeUrl = entry.validator;
        validatorCounts[nodeUrl] = (validatorCounts[nodeUrl] || 0) + 1;
    });
    //console.log('receivedValidators : ', this.receivedValidators);
    // Sort validators by their vote counts in descending order and select the top two
    const sortedValidators = Object.entries(validatorCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
        .slice(0, 2); // Take top two

    //console.log('nodesReputationsAndRoles',infos);
    // Return detailed information about each of the top validators
    const detailedValidators = sortedValidators.map(([nodeUrl, count]) => {
        // Find the node's metadata by its URL
        const nodeMetadata = infos.find(n => n.nodeUrl === nodeUrl);
        if (!nodeMetadata) {
            console.warn("Node metadata not found for URL:", nodeUrl);
            return { nodeUrl, count, role: 'Unknown', reputationScore: 'Unknown' };
        }   
        return {
            nodeUrl: nodeUrl,
            count: count,
            role: nodeMetadata.role || 'Unknown', // Default role if not found
            reputationScore: nodeMetadata.reputationScore || 0 // Default reputation if not found
        };
    });
    //console.log('detailedValidators : ', detailedValidators); 
    return detailedValidators;
};

// Select the top two validators based on the received data
// consensus.prototype.selectTopValidators = function() {
//     //console.log(this.receivedValidators)
//     const validatorCounts = {};
//     this.receivedValidators.forEach(entry => {
//         if (validatorCounts[entry.validator]) {
//             validatorCounts[entry.validator]++;
//         } else {
//             validatorCounts[entry.validator] = 1;
//         }
//     });

//     const sortedValidators = Object.entries(validatorCounts)
//         .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
//         .slice(0, 2); // Take top two

//     return sortedValidators.map(item => ({
//         nodeUrl: item[0],
//         count: item[1]
//     }));
// };

consensus.prototype.selectLeader = function(candidates) {
    // Assuming the candidates array includes objects with 'nodeUrl' and 'weight' properties
    const weights = candidates.map(candidate => candidate.weight);
    const selectedLeaderUrl = this.weightedRandomChoice(candidates.map(c => c.nodeUrl), weights);
    const selectedLeader = candidates.find(candidate => candidate.nodeUrl === selectedLeaderUrl);
    
    this.leader = selectedLeader; // Set the chosen leader
    // this.leaders.push({
    //     leader: this.leader.nodeUrl // Assuming validators are identified by 'nodeUrl'
    // });
    //console.log('the chosen leader is :',this.leader)
    return this.leader;
};

// // Add the rewardLeader method to the blockchain prototype
// consensus.prototype.rewardLeader = function() {
//     const rewardValue = 1; // Define the reward value for successfully mining a block

//     // Update the leader's reputation in the nodesReputations array
//     const leaderRepIndex = this.nodesReputations.findIndex(rep => rep.nodeUrl === this.leader.nodeUrl);
//     if (leaderRepIndex !== -1) {
//         this.nodesReputations[leaderRepIndex].reputationScore += rewardValue;

//         // If the leader is the current node, update currentNodeReputation too
//         if (this.leader.nodeUrl === this.currentNodeUrl) {
//             this.currentNodeReputation += rewardValue;
//         }

//         // Update the leader's reputation in the validators array
//         const validatorIndex = this.validators.findIndex(val => val.nodeUrl === this.leader.nodeUrl);
//         if (validatorIndex !== -1) {
//             this.validators[validatorIndex].reputationScore += rewardValue;
//         }

//         //.log(`Leader's reputation updated successfully. New reputation score: ${this.nodesReputations[leaderRepIndex].reputationScore}`);
//     } else {
//         //console.log('Leader not found in nodesReputations.');
//     }
//     return this.nodesReputations[leaderRepIndex].reputationScore;
// };

// consensus.prototype.decrementLeaderReputation = function() {

//     // Check if the leader is set
//     if (this.leader === null) {
//         console.log('No leader is currently set.');
//         return;
//     }

//     // Find the leader's reputation in the nodesReputations array
//     const leaderRepIndex = this.nodesReputations.findIndex(rep => rep.nodeUrl === this.leader.nodeUrl);
//     if (leaderRepIndex !== -1) {
//         // Calculate the new reputation score (decrement by 10%)
//         const currentReputation = this.nodesReputations[leaderRepIndex].reputationScore;
//         const newReputation = currentReputation - (currentReputation * 0.10);

//         // Update the leader's reputation in the nodesReputations array
//         this.nodesReputations[leaderRepIndex].reputationScore = newReputation;

//         // If the leader is the current node, update currentNodeReputation too
//         if (this.leader.nodeUrl === this.currentNodeUrl) {
//             this.currentNodeReputation = newReputation;
//         }

//         // Update the leader's reputation in the validators array, if the leader is also a validator
//         const validatorIndex = this.validators.findIndex(val => val.nodeUrl === this.leader.nodeUrl);
//         if (validatorIndex !== -1) {
//             this.validators[validatorIndex].reputationScore = newReputation;
//         }

//         //console.log(`Leader's reputation decreased successfully. New reputation score: ${newReputation}`);
//     } 
//     //else {
//     //     console.log('Leader not found in nodesReputations.');
//     // }
//     return newReputation;
// };

// consensus.prototype.resetAndSelectLeader = function() {
//     if (this.validators.length === 0) {
//         this.getConsensusGroup(); // Ensure validators are selected
//     }
//     return this.selectLeader(this.validators);
// };

// consensus.prototype.resetConsensus = function() {
//     const validators = this.getConsensusGroup();
//     // console.log("---------------------------------------------------------------------------------");
//     // console.log(validators);
//     const leader = this.resetAndSelectLeader();
//     // console.log("Consensus reset: New validators and a new leader have been selected.");
//     return { validators, leader };
// };



consensus.prototype.startVotingForBlock = function(blockHash) {
    this.votes[blockHash] = { yes: 0, no: 0 };
};

consensus.prototype.voteOnBlock = function(blockHash, vote) {
    // Ensure the vote is either 'yes' or 'no'
    if (vote !== 'yes' && vote !== 'no') return;

    // Tally the vote
    if (this.votes[blockHash]) {
        this.votes[blockHash][vote] += 1; // Simple count, adjust for reputation as needed
    }
};

consensus.prototype.checkBlockValidity = function(blockHash) {
    if (!this.votes[blockHash]) return false;

    const { yes, no } = this.votes[blockHash];
    return yes > no; // Block is valid if 'yes' votes outnumber 'no' votes
};

module.exports = consensus;