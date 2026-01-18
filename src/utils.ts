// Core utilities for zero-compress library
// Re-exports from specialized modules for backward compatibility

import type { CompressionStats } from './constants';

export {
  // Constants
  MAX_CHUNK_SIZE,
  COMPRESSION_TIMEOUT,
  COMPRESSION_RATE,
  MAX_DECOMPRESSION_RATIO,
  getMaxFileSize,
  getMaxDecompressedSize,
  getMaxMemoryUsage,

  // Types
  type CompressionMode,
  type ErrorVerbosity,

  // Global config
  ERROR_VERBOSITY,
  COMPRESSION_MODE,

  // Interfaces
  type CompressionStats,
  type CompressionResult
} from './constants';

export {
  // Validation functions
  validateInput,
  validateDecompressedSize,
  validateFilePath,
  validateNumericParam,
  validateBufferSize,
  sanitizeString
} from './validation';

export {
  // Security functions
  isPotentialZipBomb,
  sanitizePath,
  CircuitBreaker,
  CompressionRateLimiter,
  validateZlibOptions,
  type SafeZlibOptions
} from './security';

export {
  // Buffer operations
  BufferPool,
  BufferOperations,
  bufferPool,
  bufferOps,
  fastBufferCompare,
  fastPatternSearch,
  fastChecksum
} from './buffers';

export {
  // Monitoring
  MemoryMonitor,
  CompressionLogger,
  PerformanceMetrics,
  memoryMonitor,
  performanceMetrics
} from './monitoring';

// Legacy utility functions for backward compatibility
// These will be deprecated in favor of specialized modules

/**
 * Formats bytes for display (legacy function)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculates optimal chunk size based on file size (legacy function)
 */
export function calculateOptimalChunkSize(fileSize: number): number {
  // For small files (<1MB), use larger chunks for better compression
  if (fileSize < 1024 * 1024) {
    return Math.min(64 * 1024, fileSize);
  }
  // For medium files (1MB-100MB), use 64KB chunks
  if (fileSize < 100 * 1024 * 1024) {
    return 64 * 1024;
  }
  // For large files (>100MB), use smaller chunks to stay under RAM limits
  return 32 * 1024;
}

/**
 * Creates a timeout promise (legacy function)
 */
export function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Formats compression stats for display (legacy function)
 */
export function formatStats(stats: CompressionStats): string {
  return `Original: ${formatBytes(stats.originalSize)}, ` +
          `Compressed: ${formatBytes(stats.compressedSize)}, ` +
          `Ratio: ${(stats.ratio * 100).toFixed(2)}%, ` +
          `Savings: ${stats.savings.toFixed(2)}%, ` +
          `Time: ${stats.time}ms`;
}