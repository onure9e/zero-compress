// Main entry point for @onurege3467/zero-compress
// Exports zlib compatibility and enhanced features

// Core zlib compatibility
export * from './zlib-compat';

// Enhanced features
// Performance mode - minimal security for maximum speed
// Use local constant instead of modifying process.env for security
const COMPRESSION_MODE = (() => {
  const mode = process.env.ZERO_COMPRESS_MODE;
  if (mode === 'performance' || mode === 'balanced' || mode === 'security') {
    return mode;
  }
  return 'balanced';
})();

// Make COMPRESSION_MODE available for other modules
export { COMPRESSION_MODE };

export * from './async';
// export * from './sync'; // Temporarily disabled due to build issues
export * from './file';
export * from './streams';
export * from './utils';
export * from './errors';
export * from './config';
export * from './zlib-compat';

// Re-export CompressionResult from utils to avoid conflicts
export type { CompressionResult } from './utils';