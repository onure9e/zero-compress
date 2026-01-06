// File compression/decompression utilities
// Provides high-level functions for compressing and decompressing files

import * as fs from 'fs';
import * as path from 'path';
import { gzipAsync, gunzipAsync } from './async';
import type { GzipOptions, GunzipOptions } from './async';
import { sanitizePath, validateInput, createTimeoutPromise, COMPRESSION_TIMEOUT, CompressionRateLimiter } from './utils';

// Global rate limiter instance
const rateLimiter = new CompressionRateLimiter();

export interface CompressFileOptions extends GzipOptions {
  overwrite?: boolean;
}

export interface DecompressFileOptions extends GunzipOptions {
  overwrite?: boolean;
}

export interface CompressionResult {
  inputPath: string;
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  time: number;
}

/**
 * Compresses a file using gzip
 */
export async function compressFile(
  inputPath: string,
  outputPath?: string,
  options: CompressFileOptions = {}
): Promise<CompressionResult> {
  // Security checks
  if (!rateLimiter.canCompress()) {
    throw new Error('Rate limit exceeded. Too many compression requests.');
  }

  const sanitizedInputPath = sanitizePath(inputPath);
  const startTime = Date.now();

  if (!outputPath) {
    outputPath = `${sanitizedInputPath}.gz`;
  }

  const sanitizedOutputPath = sanitizePath(outputPath);

  if (!options.overwrite && fs.existsSync(sanitizedOutputPath)) {
    throw new Error(`Output file already exists: ${sanitizedOutputPath}`);
  }

  const inputData = await fs.promises.readFile(sanitizedInputPath);
  const validatedData = validateInput(inputData);

  const compressionPromise = gzipAsync(validatedData, options);
  const compressedData = await createTimeoutPromise(compressionPromise, COMPRESSION_TIMEOUT);

  await fs.promises.writeFile(sanitizedOutputPath, compressedData);

  const originalSize = inputData.length;
  const compressedSize = compressedData.length;
  const ratio = compressedSize / originalSize;
  const time = Date.now() - startTime;

  return {
    inputPath,
    outputPath,
    originalSize,
    compressedSize,
    ratio,
    time
  };
}

/**
 * Decompresses a gzipped file
 */
export async function decompressFile(
  inputPath: string,
  outputPath?: string,
  options: DecompressFileOptions = {}
): Promise<CompressionResult> {
  const startTime = Date.now();

  if (!outputPath) {
    // Remove .gz extension if present
    outputPath = inputPath.endsWith('.gz')
      ? inputPath.slice(0, -3)
      : `${inputPath}.out`;
  }

  if (!options.overwrite && fs.existsSync(outputPath)) {
    throw new Error(`Output file already exists: ${outputPath}`);
  }

  const inputData = await fs.promises.readFile(inputPath);
  const decompressedData = await gunzipAsync(inputData, options);

  await fs.promises.writeFile(outputPath, decompressedData);

  const originalSize = inputData.length;
  const compressedSize = decompressedData.length;
  const ratio = originalSize / compressedSize; // Decompression ratio
  const time = Date.now() - startTime;

  return {
    inputPath,
    outputPath,
    originalSize,
    compressedSize,
    ratio,
    time
  };
}

/**
 * Compresses multiple files
 */
export async function compressFiles(
  inputPaths: string[],
  outputDir?: string,
  options: CompressFileOptions = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const inputPath of inputPaths) {
    const outputPath = outputDir
      ? path.join(outputDir, path.basename(inputPath) + '.gz')
      : undefined;

    const result = await compressFile(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}

/**
 * Decompresses multiple files
 */
export async function decompressFiles(
  inputPaths: string[],
  outputDir?: string,
  options: DecompressFileOptions = {}
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const inputPath of inputPaths) {
    const outputPath = outputDir
      ? path.join(outputDir, path.basename(inputPath).replace(/\.gz$/, ''))
      : undefined;

    const result = await decompressFile(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}