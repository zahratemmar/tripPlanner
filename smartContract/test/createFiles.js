const fs = require('fs');
const path = require('path');

const startPort = 3041;
const numberOfFolders = 10;

// Files to create inside each folder
const fileNames = [
  'guides.json',
  'houses.json',
  'transport.json',
  'trips.json',
  'payments.json',
  'keys.json',
  'description.json'
];

for (let i = 0; i < numberOfFolders; i++) {
  const port = startPort + i;
  const folderPath = "C:/pfe/jsPlatform/smartContract/db/" +  port.toString();

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log(`Created a  folder`);
  }

  // Create each JSON file with [] inside
  fileNames.forEach(fileName => {
    const filePath = path.join(folderPath, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2)); // Pretty formatted []
      console.log(`Created ${fileName} `);
    }
  });
}
