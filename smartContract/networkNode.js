const express = require('express');
const Blockchain = require('./blockchain'); 
const bodyParser = require('body-parser');
const { url } = require('inspector');
const rp = require('request-promise');


let vote_first_round = [];
let leaders = [];
global.finalLeader = null;
const port = process.argv[2]; 
const nodeUrl="http://localhost:"+port
const tripChain= new Blockchain(nodeUrl);
const app = express();
app.use(bodyParser.json());  
app.use(express.json());


app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});
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
    const a = tripChain.networkNodes.indexOf(newNodeUrl)==-1;
    const b = newNodeUrl !== nodeUrl;
    if (a && b )tripChain.networkNodes.push(newNodeUrl);
    const regNodesPromises = [];
    tripChain.networkNodes.forEach(networkNodeUrl =>{
        const requestOptions ={
             uri : networkNodeUrl+'/register',
             method : 'POST',
             body : {newNodeUrl : newNodeUrl},
             json : true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    console.log("new nodw "+ newNodeUrl +"registered through this node")
    Promise.all(regNodesPromises)
    .then(data =>{
        const bulkRegisterOption ={
            uri : newNodeUrl+'/register-bulk',
            method : 'POST',
            body : {allNetworkNodes : [ ... tripChain.networkNodes , nodeUrl]},
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
    const a = tripChain.networkNodes.indexOf(newNodeUrl)==-1;
    const b = newNodeUrl !== nodeUrl;
    if (a && b) tripChain.networkNodes.push(newNodeUrl);
    res.json({
        note : "node registered successfully"
    });

 });


 app.post('/register-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    console.log(tripChain.url);
    allNetworkNodes.forEach(networkNodeUrl =>{
        console.log(networkNodeUrl);
        const a = tripChain.networkNodes.indexOf(networkNodeUrl)==-1;
        const b = networkNodeUrl !== nodeUrl;  
        console.log(b);  
        if(a && b) tripChain.networkNodes.push(networkNodeUrl);
    });

    res.json({
        note : "bulk registeration successful"
    });
});




function register(address){
    const url = 'http://localhost:'+address+'/register-and-broadcast'
    const registerOption ={
        uri : url,
        method : 'POST',
        body : {newNodeUrl: nodeUrl},
        json : true
   };
   return rp(registerOption);

}