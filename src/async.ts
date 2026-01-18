// Promise-based async APIs for zero-compress
// Provides modern async/await support for zlib operations

import * as zlib from 'zlib';
import { promisify } from 'util';
import { validateInput, validateZlibOptions, getMaxDecompressedSize, COMPRESSION_MODE } from './utils';

// Use util.promisify for better performance than manual Promise constructors
const gzipPromise = promisify(zlib.gzip);
const gunzipPromise = promisify(zlib.gunzip);
const deflatePromise = promisify(zlib.deflate);
const inflatePromise = promisify(zlib.inflate);
const deflateRawPromise = promisify(zlib.deflateRaw);
const inflateRawPromise = promisify(zlib.inflateRaw);
const brotliCompressPromise = promisify(zlib.brotliCompress);
const brotliDecompressPromise = promisify(zlib.brotliDecompress);

// Shared memory monitor for hot path optimization
let sharedMonitor: { checkMemoryUsage(): void } | null = null;

function getSharedMonitor(): { checkMemoryUsage(): void } | null {
  if (COMPRESSION_MODE === 'performance') {
    return null;
  }
  if (!sharedMonitor) {
    const MemoryMonitor = require('./monitoring').MemoryMonitor;
    sharedMonitor = new MemoryMonitor();
  }
  return sharedMonitor;
}

// Performance mode: bypass all validation overhead
const DECOMPRESSION_LIMIT = { maxOutputLength: 200 * 1024 * 1024 };

export const gzipAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return gzipPromise(buf, validateZlibOptions(options));
  }

  const validatedBuf = validateInput(buf);
  const monitor = getSharedMonitor();
  monitor?.checkMemoryUsage();

  const result = await gzipPromise(validatedBuf, validateZlibOptions(options));
  monitor?.checkMemoryUsage();

  return result;
};

export const gunzipAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return gunzipPromise(buf, { ...DECOMPRESSION_LIMIT, ...options });
  }

  const validatedBuf = validateInput(buf);
  const monitor = getSharedMonitor();
  monitor?.checkMemoryUsage();

  const result = await gunzipPromise(validatedBuf, validateZlibOptions(options));

  const maxDecomp = getMaxDecompressedSize();
  if (result.length > maxDecomp) {
    throw new Error(`Decompressed output too large: ${result.length} bytes (max: ${maxDecomp})`);
  }

  monitor?.checkMemoryUsage();
  return result;
};

export const deflateAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return deflatePromise(buf, validateZlibOptions(options));
  }

  const validatedBuf = validateInput(buf);
  return deflatePromise(validatedBuf, validateZlibOptions(options));
};

export const inflateAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return new Promise((resolve, reject) => {
      zlib.inflate(buf, { ...DECOMPRESSION_LIMIT, ...options }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  const validatedBuf = validateInput(buf);
  const monitor = getSharedMonitor();

  return new Promise((resolve, reject) => {
    zlib.inflate(validatedBuf, validateZlibOptions(options), (err, result) => {
      if (err) reject(err);
      else {
        const maxDecomp = getMaxDecompressedSize();
        if (result.length > maxDecomp) {
          reject(new Error(`Decompressed output too large: ${result.length} bytes (max: ${maxDecomp})`));
        } else {
          try {
            monitor?.checkMemoryUsage();
            resolve(result);
          } catch (memErr) {
            reject(memErr);
          }
        }
      }
    });
  });
};

export const deflateRawAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return deflateRawPromise(buf, validateZlibOptions(options));
  }

  const validatedBuf = validateInput(buf);
  return deflateRawPromise(validatedBuf, validateZlibOptions(options));
};

export const inflateRawAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    const result = await inflateRawPromise(buf, { ...DECOMPRESSION_LIMIT, ...options });
    return result;
  }

  const validatedBuf = validateInput(buf);
  const result = await inflateRawPromise(validatedBuf, validateZlibOptions(options));

  const maxDecomp = getMaxDecompressedSize();
  if (result.length > maxDecomp) {
    throw new Error(`Decompressed output too large: ${result.length} bytes (max: ${maxDecomp})`);
  }

  return result;
};

export const brotliCompressAsync = async (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  const validatedBuf = validateInput(buf);
  return brotliCompressPromise(validatedBuf, options);
};

export const brotliDecompressAsync = async (buf: zlib.InputType, options?: zlib.BrotliOptions): Promise<Buffer> => {
  if (COMPRESSION_MODE === 'performance') {
    return brotliDecompressPromise(buf, { ...DECOMPRESSION_LIMIT, ...options });
  }

  const validatedBuf = validateInput(buf);
  const result = await brotliDecompressPromise(validatedBuf, { ...DECOMPRESSION_LIMIT, ...options });

  const maxDecomp = getMaxDecompressedSize();
  if (result.length > maxDecomp) {
    throw new Error(`Decompressed output too large: ${result.length} bytes (max: ${maxDecomp})`);
  }

  return result;
};

// Type definitions for the promisified functions
export interface GzipOptions extends zlib.ZlibOptions {}
export interface GunzipOptions extends zlib.ZlibOptions {}
export interface DeflateOptions extends zlib.ZlibOptions {}
export interface InflateOptions extends zlib.ZlibOptions {}
export interface DeflateRawOptions extends zlib.ZlibOptions {}
export interface InflateRawOptions extends zlib.ZlibOptions {}
