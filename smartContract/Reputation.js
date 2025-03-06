
function Reputation(){
    this.nodesReputations = [];
}

Reputation.prototype.currentNodeReput = function() {
    // Find the reputation object for the current node using its URL
    const currentNodeRep = this.nodesReputations.find(nodeRep => nodeRep.nodeUrl === this.currentNodeUrl);
    if (currentNodeRep) {
        this.currentNodeReputation = currentNodeRep.reputationScore;  
    } else {
        // If no reputation found for the current node, set a default reputation score
        this.currentNodeReputation = 10; 
    }
    return this.currentNodeReputation;
};

Reputation.prototype.getNodeReputations = function() {
    return this.nodesReputations;
};

Reputation.prototype.updateNodeReputation = function(nodeUrl, newReputationScore, role) {
    // Find the node's reputation object in the array
    const nodeIndex = this.nodesReputations.findIndex(nodeRep => nodeRep.nodeUrl === nodeUrl);
    
    if (nodeIndex !== -1) {
        // Node found, update its reputation score
        this.nodesReputations[nodeIndex].reputationScore = newReputationScore;
        this.nodesReputations[nodeIndex].role = role; // Storing role
    } else {
        // Node not found, add it to the array with the given reputation score
        this.nodesReputations.push({
            nodeUrl: nodeUrl,
            reputationScore: newReputationScore,
            role: role // Including role during new node registration
        });
    }
    
    return this.nodesReputations;
};

// Method to set the current node URL
Reputation.prototype.setCurrentNodeUrl = function(url) {
    this.currentNodeUrl = url;
};

module.exports =Reputation;
