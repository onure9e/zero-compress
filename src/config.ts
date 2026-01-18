/**
 * Configuration management with validation
 */

import { CompressionMode, ErrorVerbosity } from './utils';

export interface AppConfig {
  maxFileSize: number;
  maxMemoryUsage: number;
  maxDecompressedSize: number;
  compressionMode: CompressionMode;
  errorVerbosity: ErrorVerbosity;
  compressionTimeout: number;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
}

export function loadConfig(): AppConfig {
  const config: AppConfig = {
    maxFileSize: parseInt(process.env.ZERO_COMPRESS_MAX_FILE_SIZE || '104857600'),
    maxMemoryUsage: parseInt(process.env.ZERO_COMPRESS_MAX_MEMORY_USAGE || '524288000'),
    maxDecompressedSize: parseInt(process.env.ZERO_COMPRESS_MAX_DECOMPRESSED_SIZE || '209715200'),
    compressionMode: (process.env.ZERO_COMPRESS_MODE as CompressionMode) || 'balanced',
    errorVerbosity: (process.env.ZERO_COMPRESS_ERROR_VERBOSITY as ErrorVerbosity) || 'minimal',
    compressionTimeout: parseInt(process.env.ZERO_COMPRESS_TIMEOUT || '30000'),
    rateLimitWindow: parseInt(process.env.ZERO_COMPRESS_RATE_WINDOW || '60000'),
    rateLimitMaxRequests: parseInt(process.env.ZERO_COMPRESS_RATE_MAX || '1000')
  };

  // Validation
  if (config.maxFileSize <= 0 || config.maxFileSize > 1073741824) { // Max 1GB
    throw new Error(`Invalid maxFileSize: ${config.maxFileSize}. Must be between 1 and 1073741824 bytes.`);
  }

  if (config.maxMemoryUsage <= 0 || config.maxMemoryUsage > 2147483648) { // Max 2GB
    throw new Error(`Invalid maxMemoryUsage: ${config.maxMemoryUsage}. Must be between 1 and 2147483648 bytes.`);
  }

  if (!['performance', 'balanced', 'security'].includes(config.compressionMode)) {
    throw new Error(`Invalid compressionMode: ${config.compressionMode}. Must be 'performance', 'balanced', or 'security'.`);
  }

  if (!['minimal', 'detailed'].includes(config.errorVerbosity)) {
    throw new Error(`Invalid errorVerbosity: ${config.errorVerbosity}. Must be 'minimal' or 'detailed'.`);
  }

  if (config.compressionTimeout <= 0 || config.compressionTimeout > 300000) { // Max 5 minutes
    throw new Error(`Invalid compressionTimeout: ${config.compressionTimeout}. Must be between 1 and 300000 milliseconds.`);
  }

  if (config.rateLimitWindow <= 0 || config.rateLimitWindow > 3600000) { // Max 1 hour
    throw new Error(`Invalid rateLimitWindow: ${config.rateLimitWindow}. Must be between 1 and 3600000 milliseconds.`);
  }

  if (config.rateLimitMaxRequests <= 0 || config.rateLimitMaxRequests > 10000) {
    throw new Error(`Invalid rateLimitMaxRequests: ${config.rateLimitMaxRequests}. Must be between 1 and 10000.`);
  }

  return config;
}

// Global config instance
export const CONFIG = loadConfig();