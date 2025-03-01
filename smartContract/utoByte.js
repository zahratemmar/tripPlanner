const fs = require('fs');
const { TextEncoder, TextDecoder } = require('util');

// Function to read a file and convert it to bytes
function fileToBytes(inputFilePath, outputFilePath) {
    fs.readFile(inputFilePath, (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            return;
        }

        // Write bytes to another file
        const bytes = new TextEncoder().encode(data)
        const byteString = [...bytes].join(" ");
        console.log(bytes)
        fs.writeFile(outputFilePath,byteString, (err) => {
            if (err) {
                console.error("Error writing file:", err);
            } else {
                console.log("File successfully written as bytes.");
            }
        });
    });
}

// Example usage
const inputFile = "smartcontract.js";  
const outputFile = "output.bin"; 

fileToBytes(inputFile, outputFile);
