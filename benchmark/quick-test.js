const { gzipAsync } = require('../dist/index');

async function quickBenchmark() {
  console.log('🚀 Quick Mode Benchmark Test\n');

  const data = Buffer.alloc(1024 * 1024, 'x'); // 1MB test data

  const modes = ['performance', 'balanced', 'security'];

  for (const mode of modes) {
    process.env.ZERO_COMPRESS_MODE = mode;

    console.log(`Testing ${mode.toUpperCase()} mode:`);

    const start = Date.now();
    const result = await gzipAsync(data);
    const duration = Date.now() - start;

    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    console.log(`  Duration: ${duration}ms`);
    console.log(`  RAM Peak: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  CPU: ${(cpu.user / 1000).toFixed(2)}ms user, ${(cpu.system / 1000).toFixed(2)}ms system\n`);
  }
}

quickBenchmark();