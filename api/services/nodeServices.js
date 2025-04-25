import promises from "fs/promises";
import rp from 'request-promise';
const fs = promises;
const file = "./nodes.json";
 
 

export async function getRandomNode() {
    try {
        const data = await fs.readFile(file, 'utf8')
        const nodes = JSON.parse(data)
        const randomIndex = Math.floor(Math.random() * nodes.length);
        console.log("Random node selected:", nodes[randomIndex]);
        return nodes[randomIndex];
      } catch (err) {
        console.error(err);
        return { status : -1 ,message: "Server error" }
      }
    } 



export async function registerNode(newNode) {
    try {
        const data =await fs.readFile(file, 'utf8')
        const nodes = JSON.parse(data)
        if (nodes.some(node => node.url === newNode.url)) {
            return { status : -1 ,message: "Node already registered" }
        }
        const dataNode = await getRandomNode();
        console.log("chosen node "+ dataNode)
        nodes.push(newNode)
        await fs.writeFile(file, JSON.stringify(nodes, null, 2));
        console.log("Node registered successfully:", newNode);
        return {status : 1, message: "Node registered successfully", dataNode : dataNode.url};
      } catch (err) {
        console.error(err);
        return { status : -1 ,message: "Server error" }
      }
    }  
    
    

export async function launchConsensus(){
  console.log("Launching consensus...");
  const node = await getRandomNode();
  console.log("node chosen = "+node.url)
  const url = node.url+'/reset-consensus'
  const registerOption ={
    uri : url,
    method : 'POST',
    body : {},
    json : true
  };
  const result = await rp(registerOption);
  console.log("Result from node:", result);
  return { leader : result.leader};
}