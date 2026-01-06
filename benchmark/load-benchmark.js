// Load time benchmark for zero-compress

console.time('Native zlib load');
const zlib = require('zlib');
console.timeEnd('Native zlib load');

console.time('Zero-compress load');
const zeroCompress = require('../dist/index.js');
console.timeEnd('Zero-compress load');

console.log('Load time comparison completed.');