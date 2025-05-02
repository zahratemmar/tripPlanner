const { performance } = require('perf_hooks');
const os = require('os');

const numLogicalCores = os.cpus().length;

// Start measuring
const startWallTime = performance.now();
const startCPUUsage = process.cpuUsage();

// --- your code here ---
for (let i = 0; i < 1e8; i++) {
  Math.sqrt(i);
}
// --- end of your code ---

// End measuring
const endWallTime = performance.now();
const endCPUUsage = process.cpuUsage(startCPUUsage);



// Calculate CPU time
const cpuTimeMicroseconds = endCPUUsage.user + endCPUUsage.system;
const cpuTimeMilliseconds = cpuTimeMicroseconds / 1000;
const wallTimeMilliseconds = endWallTime - startWallTime;

// CPU percentage (relative to 1 core)
const cpuPercentage = (cpuTimeMilliseconds / wallTimeMilliseconds) * 100;
const adjustedCPUPercentage = (cpuTimeMilliseconds / (wallTimeMilliseconds * numLogicalCores)) * 100;

console.log(`Wall time: ${wallTimeMilliseconds.toFixed(2)} ms`);
console.log(`CPU time: ${cpuTimeMilliseconds.toFixed(2)} ms`);
console.log(`Approximate CPU usage: ${adjustedCPUPercentage.toFixed(2)}%`);
