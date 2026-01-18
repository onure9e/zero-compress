// Core zlib compatibility wrapper
// Re-exports all Node.js zlib APIs for drop-in replacement

import * as zlib from 'zlib';
import { promisify } from 'util';
import { validateInput, validateZlibOptions, COMPRESSION_MODE } from './utils';

// Pre-compiled mode-specific functions to eliminate runtime conditionals
const PERFORMANCE_OPTIONS = { level: 1, memLevel: 8, windowBits: 15, strategy: 0 };
const BALANCED_OPTIONS = validateZlibOptions();
const DECOMPRESSION_LIMIT = { maxOutputLength: 200 * 1024 * 1024 };

const gzipSyncPerformance = (data: Buffer) => zlib.gzipSync(data, PERFORMANCE_OPTIONS);
const gzipSyncBalanced = (data: Buffer) => zlib.gzipSync(data, BALANCED_OPTIONS);
const gzipSyncSecurity = (data: Buffer) => zlib.gzipSync(data, validateZlibOptions());

const gunzipSyncPerformance = (data: Buffer) => zlib.gunzipSync(data, {});
const gunzipSyncBalanced = (data: Buffer) => zlib.gunzipSync(data, DECOMPRESSION_LIMIT);
const gunzipSyncSecurity = (data: Buffer) => zlib.gunzipSync(data, DECOMPRESSION_LIMIT);

// Select mode-specific implementations
const gzipSyncImpl = COMPRESSION_MODE === 'performance' ? gzipSyncPerformance :
                     COMPRESSION_MODE === 'security' ? gzipSyncSecurity : gzipSyncBalanced;

const gunzipSyncImpl = COMPRESSION_MODE === 'performance' ? gunzipSyncPerformance :
                       COMPRESSION_MODE === 'security' ? gunzipSyncSecurity : gunzipSyncBalanced;

// SECURE zlib sync exports - all inputs are validated (using pre-compiled functions)
export function gzipSync(data: zlib.InputType): Buffer {
  const validatedData = validateInput(data as Buffer | string | ArrayBuffer);
  return gzipSyncImpl(validatedData);
}

export function gunzipSync(data: Buffer): Buffer {
  const validatedData = validateInput(data);
  return gunzipSyncImpl(validatedData);
}

export function deflateSync(data: zlib.InputType): Buffer {
  const validatedData = validateInput(data as Buffer | string | ArrayBuffer);
  const safeOptions = COMPRESSION_MODE === 'performance'
    ? { level: 1, memLevel: 8, windowBits: 15, strategy: 0 }
    : validateZlibOptions();
  return zlib.deflateSync(validatedData, safeOptions);
}

export function inflateSync(data: Buffer): Buffer {
  const validatedData = validateInput(data);
  const safeOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  return zlib.inflateSync(validatedData, safeOptions);
}

export function deflateRawSync(data: zlib.InputType): Buffer {
  const validatedData = validateInput(data as Buffer | string | ArrayBuffer);
  const safeOptions = COMPRESSION_MODE === 'performance'
    ? { level: 1, memLevel: 8, windowBits: 15, strategy: 0 }
    : validateZlibOptions();
  return zlib.deflateRawSync(validatedData, safeOptions);
}

export function inflateRawSync(data: Buffer): Buffer {
  const validatedData = validateInput(data);
  const safeOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  return zlib.inflateRawSync(validatedData, safeOptions);
}

export function brotliCompressSync(data: zlib.InputType): Buffer {
  const validatedData = validateInput(data as Buffer | string | ArrayBuffer | NodeJS.ArrayBufferView);
  return zlib.brotliCompressSync(validatedData);
}

export function brotliDecompressSync(data: Buffer): Buffer {
  const validatedData = validateInput(data);
  const safeOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  return zlib.brotliDecompressSync(validatedData, safeOptions);
}

// SECURE Async versions - use promisified versions for simplicity
const gzipPromise = promisify(zlib.gzip);
const gunzipPromise = promisify(zlib.gunzip);
const deflatePromise = promisify(zlib.deflate);
const inflatePromise = promisify(zlib.inflate);
const deflateRawPromise = promisify(zlib.deflateRaw);
const inflateRawPromise = promisify(zlib.inflateRaw);
const brotliCompressPromise = promisify(zlib.brotliCompress);
const brotliDecompressPromise = promisify(zlib.brotliDecompress);

export function gzip(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const safeOptions = validateZlibOptions(options);
  return gzipPromise(validatedData, safeOptions);
}

export function gunzip(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return gunzipPromise(validatedData, safeOptions);
}

export function deflate(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const safeOptions = validateZlibOptions(options);
  return deflatePromise(validatedData, safeOptions);
}

export function inflate(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return inflatePromise(validatedData, safeOptions);
}

export function deflateRaw(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const safeOptions = validateZlibOptions(options);
  return deflateRawPromise(validatedData, safeOptions);
}

export function inflateRaw(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return inflateRawPromise(validatedData, safeOptions);
}

export function brotliCompress(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  return brotliCompressPromise(validatedData, options);
}

export function brotliDecompress(data: Buffer, options?: zlib.BrotliOptions): Promise<Buffer> {
  const validatedData = validateInput(data);
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return brotliDecompressPromise(validatedData, safeOptions);
}

// SECURE stream creation functions with option validation
export function createGzip(options?: zlib.ZlibOptions): zlib.Gzip {
  const safeOptions = validateZlibOptions(options);
  return zlib.createGzip(safeOptions);
}

export function createGunzip(options?: zlib.ZlibOptions): zlib.Gunzip {
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return zlib.createGunzip(safeOptions);
}

export function createDeflate(options?: zlib.ZlibOptions): zlib.Deflate {
  const safeOptions = validateZlibOptions(options);
  return zlib.createDeflate(safeOptions);
}

export function createInflate(options?: zlib.ZlibOptions): zlib.Inflate {
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return zlib.createInflate(safeOptions);
}

export function createDeflateRaw(options?: zlib.ZlibOptions): zlib.DeflateRaw {
  const safeOptions = validateZlibOptions(options);
  return zlib.createDeflateRaw(safeOptions);
}

export function createInflateRaw(options?: zlib.ZlibOptions): zlib.InflateRaw {
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return zlib.createInflateRaw(safeOptions);
}

export function createBrotliCompress(options?: zlib.BrotliOptions): zlib.BrotliCompress {
  return zlib.createBrotliCompress(options);
}

export function createBrotliDecompress(options?: zlib.BrotliOptions): zlib.BrotliDecompress {
  const baseOptions = COMPRESSION_MODE === 'performance' ? {} : { maxOutputLength: 200 * 1024 * 1024 };
  const safeOptions = {
    ...baseOptions,
    ...options,
    maxOutputLength: options?.maxOutputLength
      ? Math.max(options.maxOutputLength, baseOptions.maxOutputLength || 0)
      : baseOptions.maxOutputLength
  };
  return zlib.createBrotliDecompress(safeOptions);
}

export function createUnzip(options?: zlib.ZlibOptions): zlib.Unzip {
  return zlib.createUnzip(options);
}

export const Z_NO_FLUSH = zlib.Z_NO_FLUSH;
export const Z_PARTIAL_FLUSH = zlib.Z_PARTIAL_FLUSH;
export const Z_SYNC_FLUSH = zlib.Z_SYNC_FLUSH;
export const Z_FULL_FLUSH = zlib.Z_FULL_FLUSH;
export const Z_FINISH = zlib.Z_FINISH;
export const Z_BLOCK = zlib.Z_BLOCK;
export const Z_OK = zlib.Z_OK;
export const Z_STREAM_END = zlib.Z_STREAM_END;
export const Z_NEED_DICT = zlib.Z_NEED_DICT;
export const Z_ERRNO = zlib.Z_ERRNO;
export const Z_STREAM_ERROR = zlib.Z_STREAM_ERROR;
export const Z_DATA_ERROR = zlib.Z_DATA_ERROR;
export const Z_MEM_ERROR = zlib.Z_MEM_ERROR;
export const Z_BUF_ERROR = zlib.Z_BUF_ERROR;
export const Z_VERSION_ERROR = zlib.Z_VERSION_ERROR;
export const Z_NO_COMPRESSION = zlib.Z_NO_COMPRESSION;
export const Z_BEST_SPEED = zlib.Z_BEST_SPEED;
export const Z_BEST_COMPRESSION = zlib.Z_BEST_COMPRESSION;
export const Z_DEFAULT_COMPRESSION = zlib.Z_DEFAULT_COMPRESSION;
export const Z_FILTERED = zlib.Z_FILTERED;
export const Z_HUFFMAN_ONLY = zlib.Z_HUFFMAN_ONLY;
export const Z_RLE = zlib.Z_RLE;
export const Z_FIXED = zlib.Z_FIXED;
export const Z_DEFAULT_STRATEGY = zlib.Z_DEFAULT_STRATEGY;
export const Z_BINARY = zlib.Z_BINARY;
export const Z_TEXT = zlib.Z_TEXT;
export const Z_ASCII = zlib.Z_ASCII;
export const Z_UNKNOWN = zlib.Z_UNKNOWN;
export const Z_DEFLATED = zlib.Z_DEFLATED;

// FAST-PATH APIs for validated/trusted data (bypasses validation overhead)
// These are UNSAFE and should only be used with pre-validated data
const gzipFastPromise = promisify(zlib.gzip);
const gunzipFastPromise = promisify(zlib.gunzip);
const deflateFastPromise = promisify(zlib.deflate);
const inflateFastPromise = promisify(zlib.inflate);
const deflateRawFastPromise = promisify(zlib.deflateRaw);
const inflateRawFastPromise = promisify(zlib.inflateRaw);
const brotliCompressFastPromise = promisify(zlib.brotliCompress);
const brotliDecompressFastPromise = promisify(zlib.brotliDecompress);

export function gzipFast(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  return gzipFastPromise(data, options);
}

export function gunzipFast(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  return gunzipFastPromise(data, options);
}

export function deflateFast(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  return deflateFastPromise(data, options);
}

export function inflateFast(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  return inflateFastPromise(data, options);
}

export function deflateRawFast(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  return deflateRawFastPromise(data, options);
}

export function inflateRawFast(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  return inflateRawFastPromise(data, options);
}

export function brotliCompressFast(data: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> {
  return brotliCompressFastPromise(data, options);
}

export function brotliDecompressFast(data: Buffer, options?: zlib.ZlibOptions): Promise<Buffer> {
  return brotliDecompressFastPromise(data, options);
}