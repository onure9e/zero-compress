# @onurege3467/zero-compress

A drop-in replacement for Node.js `zlib` with enhanced async support, file operations, and stream utilities.

## Installation

```bash
npm install @onurege3467/zero-compress
```

## Features

- **Drop-in zlib replacement**: Use exactly like Node.js zlib
- **Promise-based async APIs**: Modern async/await support
- **File compression**: Compress/decompress files and directories
- **Enhanced streams**: Better error handling for compression streams
- **CLI tool**: Command-line compression utility
- **Full TypeScript support**: Complete type definitions

## Usage

### Drop-in Replacement

Replace `require('zlib')` with `@onurege3467/zero-compress`:

```javascript
// Instead of:
const zlib = require('zlib');

// Use:
const zlib = require('@onurege3467/zero-compress');

zlib.gzip(data, callback);
```

### Enhanced Async APIs

```javascript
const { gzipAsync, gunzipAsync } = require('@onurege3467/zero-compress');

const compressed = await gzipAsync(Buffer.from('Hello World'));
const decompressed = await gunzipAsync(compressed);
```

### File Operations

```javascript
const { compressFile, decompressFile } = require('@onurege3467/zero-compress');

const result = await compressFile('input.txt');
// result: { inputPath, outputPath, originalSize, compressedSize, ratio, time }

await decompressFile('input.txt.gz');
```

### CLI Usage

```bash
# Compress a file
zero-compress compress input.txt

# Decompress a file
zero-compress decompress input.txt.gz

# Compress multiple files
zero-compress batch-compress file1.txt file2.txt --output-dir compressed/
```

## API Reference

### Zlib Compatibility

All Node.js zlib APIs are fully supported:

- Functions: `gzip`, `gunzip`, `deflate`, `inflate`, `deflateRaw`, `inflateRaw`
- Sync functions: `gzipSync`, `gunzipSync`, etc.
- Stream creators: `createGzip`, `createGunzip`, etc.
- Constants: `Z_OK`, `Z_NO_COMPRESSION`, etc.

### Enhanced APIs

#### Async Functions
- `gzipAsync(buf, options?)`: Promise-based gzip
- `gunzipAsync(buf, options?)`: Promise-based gunzip
- And similar for other compression methods

#### File Operations
- `compressFile(inputPath, outputPath?, options?)`: Compress a file
- `decompressFile(inputPath, outputPath?, options?)`: Decompress a file
- `compressFiles(inputPaths[], outputDir?, options?)`: Batch compress
- `decompressFiles(inputPaths[], outputDir?, options?)`: Batch decompress

#### Enhanced Streams
- `createEnhancedGzip(options?)`: Gzip stream with better error handling
- `createEnhancedGunzip(options?)`: Gunzip stream with better error handling

#### Utilities
- `calculateRatio(originalSize, compressedSize)`: Calculate compression ratio
- `calculateSavings(originalSize, compressedSize)`: Calculate space savings %
- `formatBytes(bytes)`: Format bytes to human-readable
- `createStats(...)`: Create compression statistics
- `formatStats(stats)`: Format stats for display

## Examples

### Basic Compression

```javascript
const { gzipAsync, gunzipAsync } = require('@onurege3467/zero-compress');

async function compressData() {
  const data = Buffer.from('Hello, World!');
  const compressed = await gzipAsync(data);
  const decompressed = await gunzipAsync(compressed);

  console.log(decompressed.toString()); // 'Hello, World!'
}
```

### File Compression

```javascript
const { compressFile } = require('@onurege3467/zero-compress');

async function compressFile() {
  const result = await compressFile('large-file.txt');

  console.log(`Compressed ${result.originalSize} bytes to ${result.compressedSize} bytes`);
  console.log(`Space saved: ${result.savings}%`);
}
```

### Stream Compression

```javascript
const { createEnhancedGzip } = require('@onurege3467/zero-compress');
const fs = require('fs');

const input = fs.createReadStream('input.txt');
const output = fs.createWriteStream('output.txt.gz');
const gzip = createEnhancedGzip();

input.pipe(gzip).pipe(output);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT - see LICENSE file for details

## Author

onure9e