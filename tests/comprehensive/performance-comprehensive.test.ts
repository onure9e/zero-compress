import * as zlib from 'zlib';
import * as zeroCompress from '../../dist/index';

describe.skip('Performance Comprehensive Tests', () => {
  const smallData = Buffer.from('Small test data for performance benchmarking.');
  const mediumData = Buffer.from('Medium test data. '.repeat(1000)); // ~15KB
  const largeData = Buffer.from(Array.from({ length: 1024 * 1024 }, () => Math.floor(Math.random() * 256))); // 1MB random
  const compressibleLargeData = Buffer.alloc(1024 * 1024, 'x'); // 1MB compressible

  const runBenchmark = (fn: () => void, iterations: number = 100): number => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const end = process.hrtime.bigint();
    return Number(end - start) / 1e6; // Convert to milliseconds
  };

  describe('Sync Operations Performance', () => {
    test('gzipSync performance comparison', () => {
      const nativeTime = runBenchmark(() => zlib.gzipSync(mediumData), 100);
      const zeroTime = runBenchmark(() => zeroCompress.gzipSync(mediumData), 100);

      console.log(`gzipSync - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      // Allow some overhead but should be reasonable
      expect(zeroTime).toBeLessThan(nativeTime * 2);
    });

    test('gunzipSync performance comparison', () => {
      const compressed = zeroCompress.gzipSync(mediumData);

      const nativeTime = runBenchmark(() => zlib.gunzipSync(compressed), 100);
      const zeroTime = runBenchmark(() => zeroCompress.gunzipSync(compressed), 100);

      console.log(`gunzipSync - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      expect(zeroTime).toBeLessThan(nativeTime * 3); // Allow more overhead for stability
    });

    test('deflateSync performance comparison', () => {
      const nativeTime = runBenchmark(() => zlib.deflateSync(mediumData), 100);
      const zeroTime = runBenchmark(() => zeroCompress.deflateSync(mediumData), 100);

      console.log(`deflateSync - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      expect(zeroTime).toBeLessThan(nativeTime * 3); // Allow more overhead for stability
    });

    test('brotliCompressSync performance comparison', () => {
      const nativeTime = runBenchmark(() => zlib.brotliCompressSync(mediumData), 50);
      const zeroTime = runBenchmark(() => zeroCompress.brotliCompressSync(mediumData), 50);

      console.log(`brotliCompressSync - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      expect(zeroTime).toBeLessThan(nativeTime * 2);
    });
  });

  describe('Large Data Performance', () => {
    test('large random data compression', () => {
      const nativeTime = runBenchmark(() => zlib.gzipSync(largeData), 10);
      const zeroTime = runBenchmark(() => zeroCompress.gzipSync(largeData), 10);

      console.log(`Large random gzip - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      expect(zeroTime).toBeLessThan(nativeTime * 1.5); // Allow 50% overhead for large data
    });

    test('large compressible data compression', () => {
      const nativeTime = runBenchmark(() => zlib.gzipSync(compressibleLargeData), 10);
      const zeroTime = runBenchmark(() => zeroCompress.gzipSync(compressibleLargeData), 10);

      console.log(`Large compressible gzip - Native: ${nativeTime}ms, Zero-compress: ${zeroTime}ms`);

      expect(zeroTime).toBeLessThan(nativeTime * 1.5);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not have memory leaks in sync operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        const compressed = zeroCompress.gzipSync(smallData);
        const decompressed = zeroCompress.gunzipSync(compressed);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory usage - Initial: ${initialMemory}, Final: ${finalMemory}, Increase: ${memoryIncrease}`);

      // Allow some memory increase but not excessive
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Compression Ratios', () => {
    test('should achieve similar compression ratios', () => {
      const nativeCompressed = zlib.gzipSync(mediumData);
      const zeroCompressed = zeroCompress.gzipSync(mediumData);

      const nativeRatio = nativeCompressed.length / mediumData.length;
      const zeroRatio = zeroCompressed.length / mediumData.length;

      console.log(`Compression ratios - Native: ${(nativeRatio * 100).toFixed(2)}%, Zero-compress: ${(zeroRatio * 100).toFixed(2)}%`);

      // Should be very close (within 5%)
      expect(Math.abs(nativeRatio - zeroRatio)).toBeLessThan(0.05);
    });

    test('should handle different compression levels correctly', () => {
      const results = [];

      for (let level = 1; level <= 9; level++) {
        const compressed = zeroCompress.gzipSync(largeData, { level });
        const ratio = compressed.length / largeData.length;
        results.push({ level, ratio });

        console.log(`Level ${level}: ${(ratio * 100).toFixed(2)}%`);
      }

      // Higher levels should generally give better compression
      expect(results[0].ratio).toBeGreaterThan(results[results.length - 1].ratio);
    });
  });

  describe('Concurrent Performance', () => {
    test('should handle concurrent operations efficiently', async () => {
      const operations = Array(50).fill(null).map(() =>
        Promise.all([
          zeroCompress.gzipAsync(mediumData),
          zeroCompress.gunzipAsync(zeroCompress.gzipSync(mediumData))
        ])
      );

      const start = Date.now();
      await Promise.all(operations);
      const time = Date.now() - start;

      console.log(`Concurrent operations time: ${time}ms`);

      expect(time).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Stream Performance', () => {
    test('stream operations should be efficient', (done) => {
      const gzip = zeroCompress.createGzip();
      const gunzip = zeroCompress.createGunzip();

      let chunks = 0;
      let totalSize = 0;

      const start = Date.now();

      gunzip.on('data', (chunk) => {
        chunks++;
        totalSize += chunk.length;
      });

      gunzip.on('end', () => {
        const time = Date.now() - start;
        console.log(`Stream performance - Time: ${time}ms, Chunks: ${chunks}, Total size: ${totalSize}`);

        expect(time).toBeLessThan(2000);
        expect(totalSize).toBe(mediumData.length);
        done();
      });

      gzip.pipe(gunzip);
      gzip.end(mediumData);
    });
  });
});