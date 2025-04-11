const fs = require('fs');
const path = require('path');

const port = process.argv[2]; // Change this to match your setup
const dbPath = `db/${port}/`;

const files = [
    "guides.json",
    "transport.json",
    "houses.json",
    "trips.json",
    "payments.json",
    "keys.json",
    "testResult.json"
];

function emptyDBFiles() {
    files.forEach(file => {
        const filePath = path.join(dbPath, file);
        fs.writeFile(filePath, "[]", (err) => {  // Writing an empty array
            if (err) {
                console.error(`Failed to empty ${file}:`, err);
            } else {
                console.log(`Cleared ${file}`);
            }
        });
    });
}

emptyDBFiles();
