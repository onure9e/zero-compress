// Shared constants for zero-compress library
// Centralized configuration values for maintainability

// Compression limits
export const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks for optimal cache/thread balance
export const COMPRESSION_TIMEOUT = 30000; // 30 seconds base timeout
export const COMPRESSION_RATE = 1024 * 1024; // 1MB/s assumed rate

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_DECOMPRESSED_SIZE = 200 * 1024 * 1024; // 200MB

// Memory limits
export const MAX_MEMORY_USAGE = 500 * 1024 * 1024; // 500MB heap increase
export const MAX_MEMORY_USAGE_MB = 500;

// Rate limiting
export const RATE_LIMIT_WINDOW = 60000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 1000;

// Security parameters
export const MAX_DECOMPRESSION_RATIO = 100; // Maximum decompression ratio
export const ZIP_BOMB_SAMPLE_SIZE = 128; // Bytes to sample for zip bomb detection
export const ENTROPY_SAMPLE_SIZE = 256; // Bytes to sample for entropy calculation

// Circuit breaker
export const CIRCUIT_BREAKER_CHECK_INTERVAL = 2000; // 2 seconds
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;

// Memory monitoring
export const MEMORY_CHECK_INTERVAL = 100; // Check every 100ms in streams

// Performance tuning
export const ENTROPY_DIVISOR = 256; // For entropy calculation normalization
export const REPETITION_RATIO_THRESHOLD = 0.999; // For zip bomb detection

// Logging
export const DEFAULT_LOG_LEVEL = 'info';
export const LOG_BUFFER_SIZE = 1000;

// Worker threads
export const DEFAULT_WORKER_COUNT = -1; // Auto-detect (CPU cores - 1)

// Stream configuration
export const DEFAULT_HIGH_WATER_MARK = 64 * 1024; // 64KB for streams
export const BACKPRESSURE_THRESHOLD = 1024 * 1024; // 1MB

// API compatibility
export const ZLIB_API_VERSION = '1.0.0';

// Error codes
export const ERROR_CODES = {
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  INVALID_UTF8: 'INVALID_UTF8',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  DECOMPRESSION_TOO_LARGE: 'DECOMPRESSION_TOO_LARGE',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  TIMEOUT: 'TIMEOUT'
} as const;

// Compression modes
export const COMPRESSION_MODES = {
  PERFORMANCE: 'performance',
  BALANCED: 'balanced',
  SECURITY: 'security'
} as const;

export type CompressionMode = 'performance' | 'balanced' | 'security';
export type ErrorVerbosity = 'minimal' | 'detailed';

// Legacy function exports for backward compatibility
export const getMaxFileSize = () => MAX_FILE_SIZE;
export const getMaxDecompressedSize = () => MAX_DECOMPRESSED_SIZE;
export const getMaxMemoryUsage = () => MAX_MEMORY_USAGE_MB * 1024 * 1024;

// Global configuration
export const ERROR_VERBOSITY: ErrorVerbosity = (process.env.ZERO_COMPRESS_ERROR_VERBOSITY as ErrorVerbosity) || 'minimal';
export const COMPRESSION_MODE: CompressionMode = (process.env.ZERO_COMPRESS_MODE as CompressionMode) || 'balanced';

// Legacy interfaces
export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savings: number;
  time: number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savings: number;
  time: number;
}

// File extensions
export const COMPRESSION_EXTENSIONS = {
  GZIP: '.gz',
  BROTLI: '.br',
  DEFLATE: '.deflate'
} as const;