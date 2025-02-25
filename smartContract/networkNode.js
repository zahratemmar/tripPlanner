const express = require('express');
const Blockchain = require('./blockchain'); 
const bodyParser = require('body-parser');
const { exec } = require('child_process');
let vote_first_round = [];
let leaders = [];
global.finalLeader = null;
const port = process.argv[2];
const tripChain= new Blockchain();
const app = express();
app.use(bodyParser.json());  
app.use(express.json());


app.listen(port, function(){
    console.log(`Listening on port ${port}...`);
});


app.get('/blockchain', function (req, res){
    res.send(tripChain);
});

app.post('/addHost', async function (req, res){
    const hostData = req.body.hostData;
   // console.log(req.body.hostData)
    await exec('node smartContract.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(`Output: ${stdout}`);
        //res.send(stdout);
    });
});
