import {fork} from 'child_process'
const startPort = 3001;
const numberOfInstances = 3
;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (let i = 0; i < numberOfInstances; i++) {

  const port = startPort + i;
  
  const child = fork('test/clear.js', [port]);

  child.on('message', (message) => {
    console.log(`Message from node on port ${port}:`, message);
  });

  child.on('exit', (code) => {
    console.log(`Node on port ${port} exited with code ${code}`);
  });

  child.on('error', (err) => {
    console.error(`Error in node on port ${port}:`, err);
  });
}
