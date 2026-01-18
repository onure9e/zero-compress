const { gzipAsync, gunzipAsync, compressFile, decompressFile } = require('../dist/index');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Benchmark configuration
const TEST_FILE_SIZES = [1024 * 1024, 10 * 1024 * 1024, 100 * 1024 * 1024]; // 1MB, 10MB, 100MB
const MODES = ['performance', 'balanced', 'security'];
const ITERATIONS = 3;
const OUTPUT_DIR = path.join(__dirname, 'results');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Resource monitoring class with detailed CPU tracking
class ResourceMonitor {
  constructor() {
    this.startMemory = process.memoryUsage();
    this.startCpu = process.cpuUsage();
    this.startTime = process.hrtime.bigint();
    this.samples = [];
  }

  sample() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage(this.startCpu);
    const elapsed = process.hrtime.bigint() - this.startTime;

    this.samples.push({
      timestamp: Date.now(),
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers || 0
      },
      cpu: {
        user: cpu.user / 1000, // microseconds to milliseconds
        system: cpu.system / 1000,
        total: (cpu.user + cpu.system) / 1000
      },
      elapsedMs: Number(elapsed) / 1000000 // nanoseconds to milliseconds
    });
  }

  getStats() {
    if (this.samples.length === 0) return null;

    const memoryPeak = Math.max(...this.samples.map(s => s.memory.heapUsed));
    const memoryAvg = this.samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / this.samples.length;
    const cpuTotal = this.samples[this.samples.length - 1].cpu.total;
    const duration = this.samples[this.samples.length - 1].elapsedMs;

    // CPU percentage (total CPU time / elapsed time * 100)
    const cpuPercent = (cpuTotal / duration) * 100;

    return {
      memoryPeak,
      memoryAvg,
      memoryRss: Math.max(...this.samples.map(s => s.memory.rss)),
      cpuTotalMs: cpuTotal,
      cpuPercent,
      durationMs: duration,
      samples: this.samples.length
    };
  }
}

// Generate test data
function generateTestData(size) {
  // Create compressible data (repeated pattern)
  const pattern = Buffer.from('The quick brown fox jumps over the lazy dog. ');
  const chunks = Math.ceil(size / pattern.length);
  const data = Buffer.alloc(size);

  for (let i = 0; i < chunks; i++) {
    const start = i * pattern.length;
    const end = Math.min(start + pattern.length, size);
    pattern.copy(data, start, 0, end - start);
  }

  return data;
}

// Async operation benchmark with mode switching
async function benchmarkAsyncOperation(operation, data, mode, iterations = ITERATIONS) {
  // Set mode for this benchmark
  const originalMode = process.env.ZERO_COMPRESS_MODE;
  process.env.ZERO_COMPRESS_MODE = mode;

  const monitor = new ResourceMonitor();
  const results = [];

  for (let i = 0; i < iterations; i++) {
    monitor.sample();
    const start = process.hrtime.bigint();

    const result = await operation(data);

    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // ms

    monitor.sample();
    results.push({
      iteration: i + 1,
      duration,
      resultSize: result ? result.length : 0
    });
  }

  // Restore original mode
  process.env.ZERO_COMPRESS_MODE = originalMode;

  return {
    mode,
    results,
    stats: monitor.getStats(),
    avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    minDuration: Math.min(...results.map(r => r.duration)),
    maxDuration: Math.max(...results.map(r => r.duration))
  };
}

// Main benchmark runner for all modes
async function runComprehensiveBenchmark() {
  console.log('🚀 Zero-Compress Comprehensive Benchmark: All Modes\n');
  console.log('System Info:');
  console.log(`- CPU: ${os.cpus().length} cores (${os.cpus()[0].model})`);
  console.log(`- Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`- Platform: ${os.platform()} ${os.arch()}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      cpuModel: os.cpus()[0].model
    },
    benchmarks: {},
    modeComparison: {}
  };

  console.log('📊 Testing All Modes: Performance vs Balanced vs Security\n');

  for (const size of TEST_FILE_SIZES) {
    const data = generateTestData(size);
    const sizeLabel = `${(size / 1024 / 1024).toFixed(0)}MB`;

    console.log(`🔬 Benchmarking ${sizeLabel} data across all modes...\n`);

    // Get compressed data for each mode
    const compressedData = {};
    for (const mode of MODES) {
      process.env.ZERO_COMPRESS_MODE = mode;
      try {
        compressedData[mode] = await gzipAsync(data);
      } catch (e) {
        console.log(`  Warning: ${mode} mode compression failed, using balanced`);
        process.env.ZERO_COMPRESS_MODE = 'balanced';
        compressedData[mode] = await gzipAsync(data);
      }
    }

    const modeResults = {};

    for (const mode of MODES) {
      console.log(`⚡ Testing ${mode.toUpperCase()} Mode:`);

      // Gzip benchmark
      const gzipResult = await benchmarkAsyncOperation(gzipAsync, data, mode);
      console.log(`  Gzip: ${gzipResult.avgDuration.toFixed(2)}ms avg (${gzipResult.minDuration.toFixed(2)}-${gzipResult.maxDuration.toFixed(2)}ms)`);
      console.log(`  RAM: Peak ${(gzipResult.stats.memoryPeak / 1024 / 1024).toFixed(2)}MB, CPU: ${gzipResult.stats.cpuPercent.toFixed(1)}%`);

      // Gunzip benchmark
      const gunzipResult = await benchmarkAsyncOperation(gunzipAsync, compressedData[mode], mode);
      console.log(`  Gunzip: ${gunzipResult.avgDuration.toFixed(2)}ms avg (${gunzipResult.minDuration.toFixed(2)}-${gunzipResult.maxDuration.toFixed(2)}ms)`);
      console.log(`  RAM: Peak ${(gunzipResult.stats.memoryPeak / 1024 / 1024).toFixed(2)}MB, CPU: ${gunzipResult.stats.cpuPercent.toFixed(1)}%\n`);

      modeResults[mode] = {
        gzip: gzipResult,
        gunzip: gunzipResult
      };
    }

    results.benchmarks[sizeLabel] = modeResults;

    // Mode comparison for this size
    console.log(`📈 ${sizeLabel} Mode Comparison:`);
    const balancedGzip = modeResults.balanced.gzip.avgDuration;
    const balancedGunzip = modeResults.balanced.gunzip.avgDuration;

    for (const mode of MODES) {
      if (mode !== 'balanced') {
        const gzipOverhead = ((modeResults[mode].gzip.avgDuration - balancedGzip) / balancedGzip * 100);
        const gunzipOverhead = ((modeResults[mode].gunzip.avgDuration - balancedGunzip) / balancedGunzip * 100);

        console.log(`  ${mode.toUpperCase()} vs BALANCED:`);
        console.log(`    Gzip: ${gzipOverhead > 0 ? '+' : ''}${gzipOverhead.toFixed(2)}% (${gzipOverhead > 0 ? 'slower' : 'faster'})`);
        console.log(`    Gunzip: ${gunzipOverhead > 0 ? '+' : ''}${gunzipOverhead.toFixed(2)}% (${gunzipOverhead > 0 ? 'slower' : 'faster'})`);
      }
    }
    console.log('');

    results.modeComparison[sizeLabel] = modeResults;
  }

  // Native zlib comparison
  console.log('🏆 Native Zlib Comparison (Balanced Mode):\n');

  const { promisify } = require('util');
  const nativeGzip = promisify(zlib.gzip);
  const nativeGunzip = promisify(zlib.gunzip);

  for (const size of TEST_FILE_SIZES) {
    const data = generateTestData(size);
    const sizeLabel = `${(size / 1024 / 1024).toFixed(0)}MB`;

    process.env.ZERO_COMPRESS_MODE = 'balanced';
    
    // Warmup
    try { await nativeGzip(data); } catch(e){}

    // Zero-Compress balanced
    const zeroGzip = await benchmarkAsyncOperation(gzipAsync, data, 'balanced');
    const compressedData = await gzipAsync(data);
    const zeroGunzip = await benchmarkAsyncOperation(gunzipAsync, compressedData, 'balanced');

    // Native Zlib
    // We create a wrapper to use same benchmark function, 
    // passing 'native' as mode just for logging inside the function (it sets env but native ignores it)
    const zlibGzip = await benchmarkAsyncOperation(nativeGzip, data, 'native');
    const nativeCompressed = await nativeGzip(data);
    const zlibGunzip = await benchmarkAsyncOperation(nativeGunzip, nativeCompressed, 'native');

    console.log(`${sizeLabel} Data:`);
    console.log(`  Zero-Compress Gzip: ${zeroGzip.avgDuration.toFixed(2)}ms`);
    console.log(`  Native Zlib Gzip:   ${zlibGzip.avgDuration.toFixed(2)}ms`);
    
    const gzipDiff = zeroGzip.avgDuration - zlibGzip.avgDuration;
    const gzipPercent = (gzipDiff / zlibGzip.avgDuration) * 100;
    const gzipWinner = gzipDiff < 0 ? 'Zero-Compress' : 'Native Zlib';
    console.log(`  Winner: ${gzipWinner} (${Math.abs(gzipPercent).toFixed(2)}% ${gzipDiff < 0 ? 'faster' : 'slower'})`);

    console.log(`  Zero-Compress Gunzip: ${zeroGunzip.avgDuration.toFixed(2)}ms`);
    console.log(`  Native Zlib Gunzip:   ${zlibGunzip.avgDuration.toFixed(2)}ms`);
    
    const gunzipDiff = zeroGunzip.avgDuration - zlibGunzip.avgDuration;
    const gunzipPercent = (gunzipDiff / zlibGunzip.avgDuration) * 100;
    const gunzipWinner = gunzipDiff < 0 ? 'Zero-Compress' : 'Native Zlib';
    console.log(`  Winner: ${gunzipWinner} (${Math.abs(gunzipPercent).toFixed(2)}% ${gunzipDiff < 0 ? 'faster' : 'slower'})\n`);
  }

  // Save results
  const resultPath = path.join(OUTPUT_DIR, `comprehensive_benchmark_${Date.now()}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

  console.log('✅ Comprehensive benchmark completed!');
  console.log(`📄 Results saved to: ${resultPath}\n`);

  // Final summary
  console.log('🎯 FINAL SUMMARY:');
  console.log('Performance Mode: Maximum speed, minimal security');
  console.log('Balanced Mode: Optimal speed/security balance');
  console.log('Security Mode: Maximum security, acceptable speed');
  console.log('\nChoose the mode based on your requirements!');
}

// Run the comprehensive benchmark
runComprehensiveBenchmark().catch(console.error);