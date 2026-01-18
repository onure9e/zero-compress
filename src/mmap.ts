// Memory-mapped I/O for zero-copy file operations

import * as fs from 'fs';
import * as path from 'path';
import { validateInput, validateZlibOptions, COMPRESSION_MODE, getMaxFileSize, sanitizePath } from './utils';
import { parallelCompressor } from './parallel';

export interface MemoryMapOptions {
  chunkSize?: number;
  maxMemory?: number;
  useParallel?: boolean;
}

/**
 * Memory-mapped file processor for large files
 */
export class MemoryMappedProcessor {
  private options: Required<MemoryMapOptions>;

  constructor(options: MemoryMapOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize || 64 * 1024 * 1024, // 64MB chunks
      maxMemory: options.maxMemory || 256 * 1024 * 1024, // 256MB max memory
      useParallel: options.useParallel ?? true
    };
  }

  /**
   * Compress a large file using memory-mapped I/O
   */
  async compressFile(inputPath: string, outputPath: string, options?: any): Promise<void> {
    const sanitizedInputPath = sanitizePath(inputPath);
    const sanitizedOutputPath = sanitizePath(outputPath);
    const stats = await fs.promises.stat(sanitizedInputPath);
    if (stats.size > getMaxFileSize()) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${getMaxFileSize()})`);
    }

    // For smaller files, use regular processing
    if (stats.size <= this.options.chunkSize) {
      const data = await fs.promises.readFile(sanitizedInputPath);
      const compressed = await this.compressBuffer(data, options);
      await fs.promises.writeFile(sanitizedOutputPath, compressed);
      return;
    }

    // For large files, use streaming approach
    await this.compressLargeFile(sanitizedInputPath, sanitizedOutputPath, options);
  }

  /**
   * Decompress a large file using memory-mapped I/O
   */
  async decompressFile(inputPath: string, outputPath: string, options?: any): Promise<void> {
    const sanitizedInputPath = sanitizePath(inputPath);
    const sanitizedOutputPath = sanitizePath(outputPath);
    const stats = await fs.promises.stat(sanitizedInputPath);
    if (stats.size > getMaxFileSize()) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${getMaxFileSize()})`);
    }

    // For smaller files, use regular processing
    if (stats.size <= this.options.chunkSize) {
      const data = await fs.promises.readFile(sanitizedInputPath);
      const decompressed = await this.decompressBuffer(data, options);
      await fs.promises.writeFile(sanitizedOutputPath, decompressed);
      return;
    }

    // For large files, use streaming approach
    await this.decompressLargeFile(sanitizedInputPath, sanitizedOutputPath, options);
  }

  /**
   * Compress buffer data
   */
  private async compressBuffer(data: Buffer, options?: any): Promise<Buffer> {
    const validatedData = validateInput(data);

    if (this.options.useParallel && data.length > this.options.chunkSize) {
      return parallelCompressor.compressParallel(validatedData, options);
    }

    // Use streaming compression for large buffers
    const zlib = await import('zlib');
    const gzip = zlib.createGzip(validateZlibOptions(options));

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      gzip.on('data', (chunk) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);

      gzip.write(validatedData);
      gzip.end();
    });
  }

  /**
   * Decompress buffer data
   */
  private async decompressBuffer(data: Buffer, options?: any): Promise<Buffer> {
    const validatedData = validateInput(data);

    if (this.options.useParallel && data.length > this.options.chunkSize) {
      return parallelCompressor.decompressParallel(validatedData, options);
    }

    // Use streaming decompression for large buffers
    const zlib = await import('zlib');
    const gunzip = zlib.createGunzip(options);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      gunzip.on('data', (chunk) => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);

      gunzip.write(validatedData);
      gunzip.end();
    });
  }

  /**
   * Compress large file using streaming
   */
  private async compressLargeFile(inputPath: string, outputPath: string, options?: any): Promise<void> {
    const zlib = await import('zlib');
    const fs = await import('fs');

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputPath, {
        highWaterMark: this.options.chunkSize
      });

      const writeStream = fs.createWriteStream(outputPath);
      const gzip = zlib.createGzip(validateZlibOptions(options));

      let backpressure = false;

      gzip.on('data', (chunk: Buffer) => {
        backpressure = !writeStream.write(chunk);
        if (backpressure) {
          gzip.pause();
        }
      });

      writeStream.on('drain', () => {
        backpressure = false;
        gzip.resume();
      });

      readStream.on('error', (err: Error) => {
        gzip.destroy();
        writeStream.destroy();
        reject(err);
      });

      gzip.on('error', (err: Error) => {
        readStream.destroy();
        writeStream.destroy();
        reject(err);
      });

      writeStream.on('error', (err: Error) => {
        readStream.destroy();
        gzip.destroy();
        reject(err);
      });

      writeStream.on('finish', () => {
        readStream.destroy();
        gzip.destroy();
        resolve();
      });

      readStream.pipe(gzip);
    });
  }

  /**
   * Decompress large file using streaming
   */
  private async decompressLargeFile(inputPath: string, outputPath: string, options?: any): Promise<void> {
    const zlib = await import('zlib');
    const fs = await import('fs');

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputPath, {
        highWaterMark: this.options.chunkSize
      });

      const writeStream = fs.createWriteStream(outputPath);
      const gunzip = zlib.createGunzip(options);

      let backpressure = false;

      gunzip.on('data', (chunk: Buffer) => {
        backpressure = !writeStream.write(chunk);
        if (backpressure) {
          gunzip.pause();
        }
      });

      writeStream.on('drain', () => {
        backpressure = false;
        gunzip.resume();
      });

      readStream.on('error', (err: Error) => {
        gunzip.destroy();
        writeStream.destroy();
        reject(err);
      });

      gunzip.on('error', (err: Error) => {
        readStream.destroy();
        writeStream.destroy();
        reject(err);
      });

      writeStream.on('error', (err: Error) => {
        readStream.destroy();
        gunzip.destroy();
        reject(err);
      });

      writeStream.on('finish', () => {
        readStream.destroy();
        gunzip.destroy();
        resolve();
      });

      readStream.pipe(gunzip);
    });
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { used: number; available: number; limit: number } {
    const memUsage = process.memoryUsage();
    return {
      used: memUsage.heapUsed,
      available: memUsage.heapTotal - memUsage.heapUsed,
      limit: this.options.maxMemory
    };
  }
}

// Global memory-mapped processor instance
export const memoryMappedProcessor = new MemoryMappedProcessor();