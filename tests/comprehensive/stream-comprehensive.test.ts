import * as zlib from 'zlib';
import { createGzip, createGunzip, createDeflate, createInflate, createBrotliCompress, createBrotliDecompress, createEnhancedGzip, createEnhancedGunzip } from '../../dist/index';
import { Readable, Writable } from 'stream';

describe('Stream Operations Comprehensive Tests', () => {
  const testData = Buffer.from('Stream testing data for zero-compress package.'.repeat(100));
  const largeData = Buffer.alloc(1024 * 1024, 'x'); // 1MB compressible

  describe('Basic Stream Operations', () => {
    test('createGzip and createGunzip should work together', (done) => {
      const gzip = createGzip();
      const gunzip = createGunzip();

      let result = Buffer.alloc(0);

      gunzip.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      gunzip.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      gunzip.on('error', done);

      gzip.pipe(gunzip);
      gzip.end(testData);
    });

    test('createDeflate and createInflate should work', (done) => {
      const deflate = createDeflate();
      const inflate = createInflate();

      let result = Buffer.alloc(0);

      inflate.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      inflate.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      inflate.on('error', done);

      deflate.pipe(inflate);
      deflate.end(testData);
    });

    test('createBrotliCompress and createBrotliDecompress should work', (done) => {
      const brotliCompress = createBrotliCompress();
      const brotliDecompress = createBrotliDecompress();

      let result = Buffer.alloc(0);

      brotliDecompress.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      brotliDecompress.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      brotliDecompress.on('error', done);

      brotliCompress.pipe(brotliDecompress);
      brotliCompress.end(testData);
    });
  });

  describe('Enhanced Streams', () => {
    test.skip('createEnhancedGzip should provide better error handling', (done) => {
      const gzip = createEnhancedGzip();
      const gunzip = createGunzip();

      let result = Buffer.alloc(0);

      gunzip.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      gunzip.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      gunzip.on('error', done);

      gzip.pipe(gunzip);
      gzip.end(testData);
    });

    test('createEnhancedGunzip should work', (done) => {
      const gzip = createGzip();
      const gunzip = createEnhancedGunzip();

      let result = Buffer.alloc(0);

      gunzip.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      gunzip.on('end', () => {
        expect(result).toEqual(testData);
        done();
      });

      gunzip.on('error', done);

      gzip.pipe(gunzip);
      gzip.end(testData);
    });
  });

  describe('Stream Options', () => {
    test('should handle compression levels in streams', (done) => {
      const gzip1 = createGzip({ level: 1 });
      const gzip9 = createGzip({ level: 9 });
      const gunzip1 = createGunzip();
      const gunzip9 = createGunzip();

      let result1 = Buffer.alloc(0);
      let result9 = Buffer.alloc(0);

      gunzip1.on('data', (chunk) => {
        result1 = Buffer.concat([result1, chunk]);
      });

      gunzip9.on('data', (chunk) => {
        result9 = Buffer.concat([result9, chunk]);
      });

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          expect(result1).toEqual(testData);
          expect(result9).toEqual(testData);
          done();
        }
      };

      gunzip1.on('end', checkComplete);
      gunzip9.on('end', checkComplete);

      gzip1.pipe(gunzip1);
      gzip9.pipe(gunzip9);

      gzip1.end(testData);
      gzip9.end(testData);
    });

    test('should handle brotli quality options', (done) => {
      const brotliLow = createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 0 } });
      const brotliHigh = createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
      const decompressLow = createBrotliDecompress();
      const decompressHigh = createBrotliDecompress();

      let resultLow = Buffer.alloc(0);
      let resultHigh = Buffer.alloc(0);

      decompressLow.on('data', (chunk) => {
        resultLow = Buffer.concat([resultLow, chunk]);
      });

      decompressHigh.on('data', (chunk) => {
        resultHigh = Buffer.concat([resultHigh, chunk]);
      });

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          expect(resultLow).toEqual(testData);
          expect(resultHigh).toEqual(testData);
          done();
        }
      };

      decompressLow.on('end', checkComplete);
      decompressHigh.on('end', checkComplete);

      brotliLow.pipe(decompressLow);
      brotliHigh.pipe(decompressHigh);

      brotliLow.end(testData);
      brotliHigh.end(testData);
    });
  });

  describe('Stream Error Handling', () => {
    test('should handle invalid compressed data in streams', (done) => {
      const gunzip = createGunzip();
      let errorOccurred = false;

      gunzip.on('error', (err) => {
        errorOccurred = true;
        expect(err).toBeDefined();
        done();
      });

      gunzip.on('end', () => {
        if (!errorOccurred) {
          done(new Error('Expected error did not occur'));
        }
      });

      gunzip.end(Buffer.from('invalid compressed data'));
    });

    test('should handle truncated data', (done) => {
      const gzip = createGzip();
      const gunzip = createGunzip();

      let errorOccurred = false;

      gunzip.on('error', (err) => {
        errorOccurred = true;
        expect(err).toBeDefined();
        done();
      });

      gunzip.on('end', () => {
        if (!errorOccurred) {
          done(new Error('Expected error did not occur'));
        }
      });

      // Get compressed data and truncate it
      const compressed = gzip.end(testData);
      gzip.on('data', (chunk) => {
        const truncated = chunk.slice(0, chunk.length - 10);
        gunzip.end(truncated);
      });
    });
  });

  describe('Large Data Streams', () => {
    test('should handle large data streams', (done) => {
      const gzip = createGzip();
      const gunzip = createGunzip();

      let result = Buffer.alloc(0);

      gunzip.on('data', (chunk) => {
        result = Buffer.concat([result, chunk]);
      });

      gunzip.on('end', () => {
        expect(result).toEqual(largeData);
        done();
      });

      gunzip.on('error', done);

      gzip.pipe(gunzip);
      gzip.end(largeData);
    }, 10000); // Increase timeout for large data
  });

  describe('Stream Chaining', () => {
    test('should support complex stream chaining', (done) => {
      const readable = new Readable({
        read() {
          this.push(testData);
          this.push(null);
        }
      });

      const writable = new Writable({
        write(chunk, encoding, callback) {
          expect(chunk).toEqual(testData);
          callback();
          done();
        }
      });

      readable
        .pipe(createGzip())
        .pipe(createGunzip())
        .pipe(writable);
    });
  });
});