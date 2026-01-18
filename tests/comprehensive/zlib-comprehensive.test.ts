import * as zlib from 'zlib';
import * as zeroCompress from '../../dist/index';

describe('Zlib API Comprehensive Tests', () => {
  const testData = Buffer.from('Hello World! Test data for compression.');
  const largeData = Buffer.from(Array.from({ length: 1024 * 1024 }, () => Math.floor(Math.random() * 256))); // 1MB

  describe('Sync Methods', () => {
    test('gzipSync should compress and decompress correctly', () => {
      const compressed = zeroCompress.gzipSync(testData);
      const decompressed = zeroCompress.gunzipSync(compressed);

      expect(compressed).toBeInstanceOf(Buffer);
      expect(compressed.length).toBeGreaterThan(0);
      expect(decompressed).toEqual(testData);
    });

    test('deflateSync should work with different levels', () => {
      for (let level = 0; level <= 9; level++) {
        const compressed = zeroCompress.deflateSync(testData, { level });
        const decompressed = zeroCompress.inflateSync(compressed);

        expect(decompressed).toEqual(testData);
      }
    });

    test('deflateRawSync and inflateRawSync should work', () => {
      const compressed = zeroCompress.deflateRawSync(testData);
      const decompressed = zeroCompress.inflateRawSync(compressed);

      expect(decompressed).toEqual(testData);
    });

    test('should handle empty buffer', () => {
      const empty = Buffer.alloc(0);
      const compressed = zeroCompress.gzipSync(empty);
      const decompressed = zeroCompress.gunzipSync(compressed);

      expect(decompressed).toEqual(empty);
    });

    test('should handle large data', () => {
      const compressed = zeroCompress.gzipSync(largeData);
      const decompressed = zeroCompress.gunzipSync(compressed);

      expect(decompressed).toEqual(largeData);
    });

    test('brotliCompressSync and brotliDecompressSync should work', () => {
      const compressed = zeroCompress.brotliCompressSync(testData);
      const decompressed = zeroCompress.brotliDecompressSync(compressed);

      expect(decompressed).toEqual(testData);
    });
  });

  describe('Async Methods', () => {
    test('gzip should work asynchronously', async () => {
      const compressed = await zeroCompress.gzip(testData);
      const decompressed = await zeroCompress.gunzip(compressed);

      expect(decompressed).toEqual(testData);
    });

    test('gzipAsync should work with promises', async () => {
      const compressed = await zeroCompress.gzipAsync(testData);
      const decompressed = await zeroCompress.gunzipAsync(compressed);

      expect(decompressed).toEqual(testData);
    });

    test('should handle errors in async methods', async () => {
      await expect(zeroCompress.gunzipAsync(Buffer.from('invalid'))).rejects.toThrow();
    });
  });

  describe('Stream Methods', () => {
    test('createGzip and createGunzip should work', (done) => {
      const gzip = zeroCompress.createGzip();
      const gunzip = zeroCompress.createGunzip();

      let result = Buffer.alloc(0);

      gunzip.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      gunzip.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      gzip.pipe(gunzip);
      gzip.end(testData);
    });

    test('createDeflate and createInflate should work', (done) => {
      const deflate = zeroCompress.createDeflate();
      const inflate = zeroCompress.createInflate();

      let result = Buffer.alloc(0);

      inflate.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      inflate.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      deflate.pipe(inflate);
      deflate.end(testData);
    });

    test('createBrotliCompress and createBrotliDecompress should work', (done) => {
      const brotliCompress = zeroCompress.createBrotliCompress();
      const brotliDecompress = zeroCompress.createBrotliDecompress();

      let result = Buffer.alloc(0);

      brotliDecompress.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      brotliDecompress.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      brotliCompress.pipe(brotliDecompress);
      brotliCompress.end(testData);
    });
  });

  describe('Constants', () => {
    test('should export all zlib constants', () => {
      expect(zeroCompress.Z_OK).toBe(zlib.Z_OK);
      expect(zeroCompress.Z_STREAM_END).toBe(zlib.Z_STREAM_END);
      expect(zeroCompress.Z_NO_COMPRESSION).toBe(zlib.Z_NO_COMPRESSION);
      expect(zeroCompress.Z_BEST_SPEED).toBe(zlib.Z_BEST_SPEED);
      expect(zeroCompress.Z_BEST_COMPRESSION).toBe(zlib.Z_BEST_COMPRESSION);
      expect(zeroCompress.Z_DEFAULT_COMPRESSION).toBe(zlib.Z_DEFAULT_COMPRESSION);
    });
  });

  describe('Options and Edge Cases', () => {
    test('should handle different compression levels', () => {
      for (let level = 0; level <= 9; level++) {
        const compressed = zeroCompress.gzipSync(testData, { level });
        const decompressed = zeroCompress.gunzipSync(compressed);

        expect(decompressed).toEqual(testData);
      }
    });

    test('should handle different strategies', () => {
      const strategies = [
        zeroCompress.Z_DEFAULT_STRATEGY,
        zeroCompress.Z_FILTERED,
        zeroCompress.Z_HUFFMAN_ONLY,
        zeroCompress.Z_RLE,
        zeroCompress.Z_FIXED
      ];

      strategies.forEach(strategy => {
        const compressed = zeroCompress.deflateSync(testData, { strategy });
        const decompressed = zeroCompress.inflateSync(compressed);

        expect(decompressed).toEqual(testData);
      });
    });

    test('should handle windowBits option', () => {
      const compressed = zeroCompress.gzipSync(testData, { windowBits: 15 });
      const decompressed = zeroCompress.gunzipSync(compressed);

      expect(decompressed).toEqual(testData);
    });

    test('should handle memLevel option', () => {
      for (let memLevel = 1; memLevel <= 9; memLevel++) {
        const compressed = zeroCompress.deflateSync(testData, { memLevel });
        const decompressed = zeroCompress.inflateSync(compressed);

        expect(decompressed).toEqual(testData);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid compressed data', () => {
      expect(() => {
        zeroCompress.gunzipSync(Buffer.from('invalid data'));
      }).toThrow();
    });

    test('should handle truncated compressed data', () => {
      const compressed = zeroCompress.gzipSync(testData);
      const truncated = compressed.slice(0, compressed.length - 10);

      expect(() => {
        zeroCompress.gunzipSync(truncated);
      }).toThrow();
    });
  });
});