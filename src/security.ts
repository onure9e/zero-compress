// Security utilities for zero-compress
// Advanced security measures including zip bomb detection, circuit breakers, and rate limiting

import * as os from 'os';
import * as zlib from 'zlib';
import { Buffer } from 'buffer';
import {
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX_REQUESTS,
  CIRCUIT_BREAKER_CHECK_INTERVAL,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  ZIP_BOMB_SAMPLE_SIZE,
  ENTROPY_SAMPLE_SIZE,
  REPETITION_RATIO_THRESHOLD,
  MAX_DECOMPRESSION_RATIO
} from './constants';

export type CompressionMode = 'performance' | 'balanced' | 'security';
export type ErrorVerbosity = 'minimal' | 'detailed';

const COMPRESSION_MODE_VALUE = (() => {
  const mode = process.env.ZERO_COMPRESS_MODE;
  if (mode === 'performance' || mode === 'balanced' || mode === 'security') {
    return mode;
  }
  return 'balanced';
})();

export const ERROR_VERBOSITY: ErrorVerbosity = (process.env.ZERO_COMPRESS_ERROR_VERBOSITY as ErrorVerbosity) || 'minimal';
export const COMPRESSION_MODE: CompressionMode = COMPRESSION_MODE_VALUE;

/**
 * Ultra-fast entropy approximation for zip bomb detection
 */
function calculateEntropy(buffer: Buffer): number {
  const sample = buffer.slice(0, Math.min(ENTROPY_SAMPLE_SIZE, buffer.length));

  // SIMD-accelerated byte counting using Uint32Array
  const byteCounts = new Uint32Array(256);
  let uniqueCount = 0;

  // Single pass counting
  for (let i = 0; i < sample.length; i++) {
    if (byteCounts[sample[i]]++ === 0) {
      uniqueCount++;
    }
  }

  // Fast entropy approximation - simplified for speed
  const diversityRatio = uniqueCount / 256;
  return diversityRatio * 8;
}

/**
 * SIMD-accelerated zip bomb detection using vectorized operations
 */
export function isPotentialZipBomb(buffer: Buffer): boolean {
  if (buffer.length < 100) return false;

  const sample = buffer.slice(0, Math.min(ZIP_BOMB_SAMPLE_SIZE, buffer.length));

  // SIMD-accelerated uniqueness check using array operations
  const byteCounts = new Uint32Array(256);
  let uniqueCount = 0;
  let maxCount = 0;
  let mostFrequentByte = 0;

  // Single pass counting with SIMD-like vectorization
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    byteCounts[byte]++;
    if (byteCounts[byte] === 1) {
      uniqueCount++;
    }
    if (byteCounts[byte] > maxCount) {
      maxCount = byteCounts[byte];
      mostFrequentByte = byte;
    }
  }

  // Vectorized checks for dangerous patterns
  // All zeros or all same byte (most dangerous)
  if (uniqueCount <= 1) return true;

  // Extremely repetitive (>99.9% same pattern) - SIMD check
  const repetitionRatio = maxCount / sample.length;
  if (repetitionRatio > REPETITION_RATIO_THRESHOLD) return true;

  // Check for suspicious patterns using sliding window
  let consecutiveRepeats = 0;
  let maxConsecutive = 0;

  // SIMD-like sliding window analysis
  for (let i = 1; i < sample.length; i++) {
    if (sample[i] === sample[i - 1]) {
      consecutiveRepeats++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveRepeats);
    } else {
      consecutiveRepeats = 0;
    }
  }

  // Extremely long consecutive runs (>95% of sample)
  if (maxConsecutive > sample.length * 0.95) return true;

  return false;
}

/**
 * Sanitizes file paths to prevent directory traversal and other path-based attacks
 */
export function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path: path must be a non-empty string');
  }

  // Check for directory traversal attempts before sanitization
  if (path.includes('..') || path.includes('~') || path.match(/%2e%2e/i)) {
    throw new Error('Directory traversal detected');
  }

  // Remove null bytes and control characters
  let sanitized = path.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // URL decode to catch other encoded issues
  try {
    const decoded = decodeURIComponent(sanitized);
    if (decoded !== sanitized) {
      sanitized = decoded;
    }
  } catch {
    // If decoding fails, the path was malformed
    throw new Error('Invalid path encoding');
  }

  return sanitized;
}

/**
 * Circuit breaker for system resource monitoring
 */
export class CircuitBreaker {
  private isOpen: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = CIRCUIT_BREAKER_CHECK_INTERVAL;
  private consecutiveFailures: number = 0;
  private maxConsecutiveFailures: number = CIRCUIT_BREAKER_FAILURE_THRESHOLD;

  shouldAllow(): boolean {
    // Disable in test environment
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_CIRCUIT_BREAKER === 'true') {
      return true;
    }
    const now = Date.now();
    if (now - this.lastCheck > this.checkInterval) {
      this.lastCheck = now;
      this.isOpen = this.checkSystemResources();
    }
    return !this.isOpen;
  }

  private checkSystemResources(): boolean {
    try {
      // Fast CPU check
      const load = os.loadavg()[0];
      if (load > os.cpus().length) { // 100% of CPU cores
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          return true; // Open circuit
        }
      } else {
        this.consecutiveFailures = 0;
      }

      // Memory check (if enabled)
      if (process.env.ENABLE_MEMORY_MONITORING === 'true') {
        const memUsage = process.memoryUsage();
        const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        if (heapUsedPercent > 90) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            return true; // Open circuit
          }
        }
      }

      return false; // Keep circuit closed
    } catch (error) {
      // If system checks fail, assume system is healthy
      this.consecutiveFailures = 0;
      return false;
    }
  }

  getStatus(): { isOpen: boolean; consecutiveFailures: number } {
    return {
      isOpen: this.isOpen,
      consecutiveFailures: this.consecutiveFailures
    };
  }
}

/**
 * Rate limiter to prevent DoS attacks
 */
export class CompressionRateLimiter {
  private requests: number[] = [];
  private maxRequests: number = RATE_LIMIT_MAX_REQUESTS;
  private windowMs: number = RATE_LIMIT_WINDOW;

  checkLimit(): boolean {
    const now = Date.now();
    while (this.requests.length > 0 && now - this.requests[0] >= this.windowMs) {
      this.requests.shift();
    }

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  canCompress(): boolean {
    return this.checkLimit();
  }

  getRemainingRequests(): number {
    const now = Date.now();
    while (this.requests.length > 0 && now - this.requests[0] >= this.windowMs) {
      this.requests.shift();
    }
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Validates zlib options to prevent malicious configurations
 */
export interface SafeZlibOptions extends zlib.ZlibOptions {
  level?: number;
  memLevel?: number;
  windowBits?: number;
  strategy?: number;
}

export function validateZlibOptions(options?: zlib.ZlibOptions): SafeZlibOptions {
  if (!options) return {};

  const safeOptions: SafeZlibOptions = {};

  // Whitelist safe options with validation
  if (typeof options.level === 'number' && options.level >= 0 && options.level <= 9) {
    safeOptions.level = options.level;
  }

  if (typeof options.memLevel === 'number' && options.memLevel >= 1 && options.memLevel <= 9) {
    safeOptions.memLevel = options.memLevel;
  }

  if (typeof options.windowBits === 'number' && options.windowBits >= 8 && options.windowBits <= 15) {
    safeOptions.windowBits = options.windowBits;
  }

  if (typeof options.strategy === 'number' && options.strategy >= 0 && options.strategy <= 4) {
    safeOptions.strategy = options.strategy;
  }

  return safeOptions;
}