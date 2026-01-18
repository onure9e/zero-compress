// Input validation utilities for zero-compress
// Comprehensive input sanitization and type checking

import { Buffer } from 'buffer';
import {
  MAX_FILE_SIZE,
  ERROR_CODES,
  MAX_DECOMPRESSED_SIZE,
  COMPRESSION_MODE
} from './constants';
import { isPotentialZipBomb } from './security';

// Check environment once at module load
// const DISABLE_ZIP_BOMB_CHECK = process.env.DISABLE_ZIP_BOMB_CHECK === 'true'; // Moved to inside function

// Pre-computed entropy threshold for compressed data detection
const HIGH_ENTROPY_THRESHOLD = 7.5;
const COMPRESSED_DATA_MIN_SIZE = 100;

function calculateEntropy(buffer: Buffer): number {
  const frequencies = new Float64Array(256);
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / buffer.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export type InputType = string | ArrayBuffer | NodeJS.ArrayBufferView;

/**
 * Validates input data with proper TypeScript types
 * Supports all zlib.InputType variants including DataView, Uint8Array, etc.
 */
export function validateInput(input: Buffer | string | ArrayBuffer | NodeJS.ArrayBufferView): Buffer {
  if (Buffer.isBuffer(input)) {
    if (input.length > MAX_FILE_SIZE) {
      throw new Error(`Input too large: ${input.length} bytes (max: ${MAX_FILE_SIZE})`);
    }

    // Check environment variable at runtime
    if (process.env.DISABLE_ZIP_BOMB_CHECK === 'true') {
      return input;
    }

    if (process.env.ZERO_COMPRESS_MODE === 'performance') {
      return input;
    }

    if (input.length >= COMPRESSED_DATA_MIN_SIZE) {
      const entropy = calculateEntropy(input);
      if (entropy > HIGH_ENTROPY_THRESHOLD) {
        return input;
      }
    }

    if (isPotentialZipBomb(input)) {
      throw new Error('Potential zip bomb detected');
    }

    return input;
  } else if (typeof input === 'string') {
    const buffer = Buffer.from(input, 'utf8');
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Input too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }
    return buffer;
  } else if (input instanceof ArrayBuffer) {
    const buffer = Buffer.from(input);
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Input too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }
    return buffer;
  } else if (ArrayBuffer.isView(input)) {
    const buffer = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Input too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }
    return buffer;
  } else {
    throw new Error('Invalid input type. Expected Buffer, string, ArrayBuffer, or ArrayBufferView.');
  }
}

/**
 * Validates decompression output size to prevent zip bomb attacks
 */
export function validateDecompressedSize(size: number): void {
  if (size > MAX_DECOMPRESSED_SIZE) {
    throw new Error(`Decompressed output too large: ${size} bytes (max: ${MAX_DECOMPRESSED_SIZE})`);
  }
}

/**
 * Validates file paths for security
 */
export function validateFilePath(path: string): void {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid file path: must be a non-empty string');
  }

  // Prevent extremely long paths that could cause issues
  if (path.length > 4096) {
    throw new Error('File path too long (max: 4096 characters)');
  }

  // Prevent null bytes in paths
  if (path.includes('\0')) {
    throw new Error('File path contains null bytes');
  }
}

/**
 * Validates numeric parameters within safe ranges
 */
export function validateNumericParam(value: number, name: string, min?: number, max?: number): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid ${name}: must be a valid number`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`Invalid ${name}: must be >= ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`Invalid ${name}: must be <= ${max}`);
  }
}

/**
 * Validates buffer allocation requests
 */
export function validateBufferSize(size: number): void {
  if (size < 0) {
    throw new Error('Buffer size cannot be negative');
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error(`Buffer size too large: ${size} bytes (max: ${MAX_FILE_SIZE})`);
  }
}

/**
 * Sanitizes and validates string inputs
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Remove null bytes and control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  if (maxLength && sanitized.length > maxLength) {
    throw new Error(`String too long (max: ${maxLength} characters)`);
  }

  return sanitized;
}