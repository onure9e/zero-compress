#!/usr/bin/env node

// CLI tool for zero-compress
// Provides command-line interface for compression operations

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { compressFile, decompressFile, compressFiles } from '../file';
import { formatStats, sanitizePath } from '../utils';

const program = new Command();

// Custom theme
const theme = {
  success: chalk.green.bold,
  error: chalk.red.bold,
  info: chalk.blue,
  warning: chalk.yellow,
  dim: chalk.gray,
  highlight: chalk.cyan.bold
};

program
  .name('zero-compress')
  .description(theme.info('Ultra-fast compression utility for Node.js'))
  .version('1.0.0');

// Helper to draw a progress bar
function drawProgressBar(percentage: number, width = 20): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  // Ensure non-negative
  const safeFilled = Math.max(0, filled);
  const safeEmpty = Math.max(0, empty);
  
  return '[' + 
    chalk.green('█'.repeat(safeFilled)) + 
    chalk.gray('░'.repeat(safeEmpty)) + 
    ']';
}

program
  .command('compress <input>')
  .description('Compress a file using gzip')
  .option('-o, --output <output>', 'Output file path')
  .option('--overwrite', 'Overwrite existing output file')
  .option('-l, --level <level>', 'Compression level (0-9)', parseInt, 6)
  .action(async (input: string, options: any) => {
    const startTime = process.hrtime();
    console.log(theme.dim(`\n🚀 Starting compression for ${chalk.white(input)}...`));

    try {
      const sanitizedInput = sanitizePath(input);
      const sanitizedOutput = options.output ? sanitizePath(options.output) : undefined;

      const result = await compressFile(sanitizedInput, sanitizedOutput, {
        level: options.level,
        overwrite: options.overwrite
      });

      const endTime = process.hrtime(startTime);
      const duration = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);
      const savings = ((result.originalSize - result.compressedSize) / result.originalSize) * 100;
      const savingsStr = savings.toFixed(2);

      console.log(`\n${theme.success('✔ Compression successful!')}`);
      
      // Stats Table
      console.log(theme.dim('─'.repeat(50)));
      console.log(`${theme.highlight('Input Size:')}      ${formatStats(result).split('\n')[1].split(':')[1].trim()}`);
      console.log(`${theme.highlight('Output Size:')}     ${formatStats(result).split('\n')[2].split(':')[1].trim()}`);
      console.log(`${theme.highlight('Savings:')}         ${savings > 0 ? chalk.green(savingsStr + '%') : chalk.red(savingsStr + '%')} ${drawProgressBar(Math.max(0, savings))}`);
      console.log(`${theme.highlight('Time:')}            ${duration}ms`);
      console.log(theme.dim('─'.repeat(50)));
      console.log(theme.dim(`Output: ${result.outputPath}\n`));

    } catch (error) {
      console.error(`\n${theme.error('✖ Compression failed:')}`);
      console.error(theme.warning(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('decompress <input>')
  .description('Decompress a gzipped file')
  .option('-o, --output <output>', 'Output file path')
  .option('--overwrite', 'Overwrite existing output file')
  .action(async (input: string, options: any) => {
    const startTime = process.hrtime();
    console.log(theme.dim(`\n📦 Starting decompression for ${chalk.white(input)}...`));

    try {
      const sanitizedInput = sanitizePath(input);
      const sanitizedOutput = options.output ? sanitizePath(options.output) : undefined;

      const result = await decompressFile(sanitizedInput, sanitizedOutput, {
        overwrite: options.overwrite
      });

      const endTime = process.hrtime(startTime);
      const duration = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);

       console.log(`\n${theme.success('✔ Decompression successful!')}`);
       console.log(theme.dim('─'.repeat(40)));
       console.log(`${theme.highlight('Time:')}    ${duration}ms`);
       console.log(`${theme.highlight('Output:')}  ${result.outputPath}`);
       console.log(theme.dim('─'.repeat(40)) + '\n');

    } catch (error) {
      console.error(`\n${theme.error('✖ Decompression failed:')}`);
      console.error(theme.warning(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('batch-compress <inputs...>')
  .description('Compress multiple files')
  .option('-d, --output-dir <dir>', 'Output directory')
  .option('--overwrite', 'Overwrite existing files')
  .option('-l, --level <level>', 'Compression level (0-9)', parseInt, 6)
  .action(async (inputs: string[], options: any) => {
    const startTime = process.hrtime();
    console.log(theme.dim(`\n🚀 Starting batch compression for ${inputs.length} files...`));

    try {
      const sanitizedInputs = inputs.map(sanitizePath);
      const sanitizedOutputDir = options.outputDir ? sanitizePath(options.outputDir) : undefined;

      const results = await compressFiles(sanitizedInputs, sanitizedOutputDir, {
        level: options.level,
        overwrite: options.overwrite
      });

      const endTime = process.hrtime(startTime);
      const duration = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(2);

      let totalOriginal = 0;
      let totalCompressed = 0;

      console.log(`\n${theme.success(`✔ Batch processing complete in ${duration}ms!`)}\n`);
      
      results.forEach((result, index) => {
        totalOriginal += result.originalSize;
        totalCompressed += result.compressedSize;
        
        const savings = ((result.originalSize - result.compressedSize) / result.originalSize) * 100;
        const symbol = savings > 0 ? chalk.green('↓') : chalk.red('↑');
        
        console.log(`${chalk.gray(index + 1 + '.')}} ${path.basename(result.outputPath)} ${symbol} ${Math.abs(savings).toFixed(1)}%`);
      });

      const totalSavings = ((totalOriginal - totalCompressed) / totalOriginal) * 100;
      
      console.log(theme.dim('\n─'.repeat(50)));
      console.log(`${theme.highlight('Total Savings:')}   ${totalSavings.toFixed(2)}% ${drawProgressBar(Math.max(0, totalSavings))}`);
      console.log(`${theme.highlight('Total Time:')}      ${duration}ms`);
      console.log(theme.dim('─'.repeat(50)) + '\n');

    } catch (error) {
      console.error(`\n${theme.error('✖ Batch compression failed:')}`);
      console.error(theme.warning(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse();
