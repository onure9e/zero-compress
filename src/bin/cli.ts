#!/usr/bin/env node

// CLI tool for zero-compress
// Provides command-line interface for compression operations

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { compressFile, decompressFile, compressFiles, decompressFiles } from '../file';
import { formatStats, sanitizePath } from '../utils';

const program = new Command();

program
  .name('zero-compress')
  .description('Compression utility for Node.js')
  .version('1.0.0');

program
  .command('compress <input>')
  .description('Compress a file using gzip')
  .option('-o, --output <output>', 'Output file path')
  .option('--overwrite', 'Overwrite existing output file')
  .option('-l, --level <level>', 'Compression level (0-9)', parseInt, 6)
  .action(async (input: string, options: any) => {
    try {
      // Sanitize input path for security
      const sanitizedInput = sanitizePath(input);
      const sanitizedOutput = options.output ? sanitizePath(options.output) : undefined;

      const result = await compressFile(sanitizedInput, sanitizedOutput, {
        level: options.level,
        overwrite: options.overwrite
      });

      console.log('File compressed successfully!');
      console.log(formatStats({
        ...result,
        savings: ((result.originalSize - result.compressedSize) / result.originalSize) * 100
      }));
    } catch (error) {
      console.error('Compression failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('decompress <input>')
  .description('Decompress a gzipped file')
  .option('-o, --output <output>', 'Output file path')
  .option('--overwrite', 'Overwrite existing output file')
  .action(async (input: string, options: any) => {
    try {
      const sanitizedInput = sanitizePath(input);
      const sanitizedOutput = options.output ? sanitizePath(options.output) : undefined;

      const result = await decompressFile(sanitizedInput, sanitizedOutput, {
        overwrite: options.overwrite
      });

      console.log('File decompressed successfully!');
      console.log(`Original: ${result.inputPath}`);
      console.log(`Output: ${result.outputPath}`);
      console.log(`Time: ${result.time}ms`);
    } catch (error) {
      console.error('Decompression failed:', error instanceof Error ? error.message : String(error));
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
    try {
      const sanitizedInputs = inputs.map(sanitizePath);
      const sanitizedOutputDir = options.outputDir ? sanitizePath(options.outputDir) : undefined;

      const results = await compressFiles(sanitizedInputs, sanitizedOutputDir, {
        level: options.level,
        overwrite: options.overwrite
      });

      console.log(`${results.length} files compressed successfully!`);
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${path.basename(result.inputPath)}`);
        console.log(formatStats({
          ...result,
          savings: ((result.originalSize - result.compressedSize) / result.originalSize) * 100
        }));
      });
    } catch (error) {
      console.error('Batch compression failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();