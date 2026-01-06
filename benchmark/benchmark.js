// Benchmark script for zero-compress vs native zlib

const zlib = require('zlib');
const zeroCompress = require('../dist/index.js');

const testData = Buffer.alloc(1000000, () => Math.floor(Math.random() * 256)); // 1MB of random data
const iterations = 25;

console.log('Benchmarking compression performance...');
console.log(`Test data size: ${testData.length} bytes`);
console.log(`Iterations: ${iterations}`);
console.log();

// Benchmark native zlib
let start = Date.now();
for (let i = 0; i < iterations; i++) {
  zlib.deflateSync(testData, { level: 0 });
}
const zlibTime = Date.now() - start;
console.log(`Native zlib deflate level 0 time: ${zlibTime}ms`);

// Benchmark zero-compress
start = Date.now();
for (let i = 0; i < iterations; i++) {
  zeroCompress.deflateSync(testData, { level: 0 });
}
const zeroTime = Date.now() - start;
console.log(`Zero-compress deflate level 0 time: ${zeroTime}ms`);

const overhead = ((zeroTime - zlibTime) / zlibTime * 100).toFixed(2);
console.log(`Overhead: ${overhead}%`);

console.log();
// Test functionality
const compressed = zeroCompress.gzipSync(testData);
const decompressed = zeroCompress.gunzipSync(compressed);
const success = decompressed.equals(testData);
console.log(`Functionality test: ${success ? 'PASS' : 'FAIL'}`);