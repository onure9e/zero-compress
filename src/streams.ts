// Stream enhancements for zero-compress
// Provides improved stream handling with better error management

import { Transform } from 'stream';
import * as zlib from 'zlib';
import type { ZlibOptions } from 'zlib';
import { MAX_CHUNK_SIZE, validateZlibOptions, MemoryMonitor, MAX_DECOMPRESSION_RATIO, COMPRESSION_MODE } from './utils';

/**
 * Enhanced Gzip stream with better error handling
 */
export class EnhancedGzip extends Transform {
  private gzip: zlib.Gzip;
  private _destroyed: boolean = false;

  constructor(options?: ZlibOptions) {
    super();
    this.gzip = zlib.createGzip(validateZlibOptions(options));

    this.gzip.on('data', (chunk) => {
      if (!this._destroyed) {
        this.push(chunk);
      }
    });
    this.gzip.on('end', () => {
      if (!this._destroyed) {
        this.push(null);
      }
    });
    this.gzip.on('error', (err) => {
      if (!this._destroyed) {
        this.emit('error', err);
      }
    });
  }

  _transform(chunk: Buffer, encoding: BufferEncoding | undefined, callback: Function) {
    if (this._destroyed) {
      callback(new Error('Stream destroyed'));
      return;
    }
    if (chunk.length > MAX_CHUNK_SIZE) {
      callback(new Error(`Chunk too large: ${chunk.length} bytes (max: ${MAX_CHUNK_SIZE})`));
      return;
    }
    this.gzip.write(chunk, (err) => {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  }

  _flush(callback: Function) {
    if (this._destroyed) {
      callback(new Error('Stream destroyed'));
      return;
    }
    this.gzip.end(() => {
      callback();
    });
  }

  destroy(error?: Error): this {
    if (this._destroyed) return this;
    this._destroyed = true;
    this.gzip.destroy(error);
    return super.destroy(error);
  }
}

/**
 * Enhanced Gunzip stream with better error handling and decompression limits
 */
export class EnhancedGunzip extends Transform {
  private gunzip: zlib.Gunzip;
  private monitor: MemoryMonitor;
  private totalInput: number = 0;
  private totalOutput: number = 0;
  private isInternalDestroyed: boolean = false;

  constructor(options?: ZlibOptions) {
    super();

    const zlibOptions = COMPRESSION_MODE === 'performance'
      ? { ...options }
      : validateZlibOptions(options);

    this.gunzip = zlib.createGunzip(zlibOptions);
    this.monitor = new MemoryMonitor();

    this.gunzip.on('data', (chunk) => {
      if (this.isInternalDestroyed) return;

      this.totalOutput += chunk.length;

      if (COMPRESSION_MODE === 'security' && this.totalInput > 0) {
        const ratio = this.totalOutput / this.totalInput;
        if (ratio > MAX_DECOMPRESSION_RATIO) {
          this.gunzip.destroy(new Error(`Decompression ratio too high: ${ratio.toFixed(2)} (max: ${MAX_DECOMPRESSION_RATIO}). Potential zip bomb detected.`));
          return;
        }
      }

      if (COMPRESSION_MODE !== 'performance') {
        try {
          this.monitor.checkMemoryUsage();
        } catch (err) {
          this.gunzip.destroy(err as Error);
          return;
        }
      }

      this.push(chunk);
    });
    this.gunzip.on('end', () => {
      if (!this.isInternalDestroyed) {
        this.push(null);
      }
    });
    this.gunzip.on('error', (err) => {
      if (!this.isInternalDestroyed) {
        this.emit('error', err);
      }
    });
  }

  _transform(chunk: Buffer, encoding: BufferEncoding | undefined, callback: Function) {
    if (this.isInternalDestroyed) {
      callback(new Error('Stream destroyed'));
      return;
    }
    const maxChunkSize = COMPRESSION_MODE === 'performance' ? MAX_CHUNK_SIZE * 2 : MAX_CHUNK_SIZE;

    if (chunk.length > maxChunkSize) {
      callback(new Error(`Chunk too large: ${chunk.length} bytes (max: ${maxChunkSize})`));
      return;
    }

    this.totalInput += chunk.length;
    this.gunzip.write(chunk, callback as any);
  }

  _flush(callback: Function) {
    if (this.isInternalDestroyed) {
      callback(new Error('Stream destroyed'));
      return;
    }
    try {
      this.monitor.checkMemoryUsage();
      this.gunzip.end(callback);
    } catch (err) {
      callback(err);
    }
  }

  destroy(error?: Error): this {
    if (this.isInternalDestroyed) return this;
    this.isInternalDestroyed = true;
    this.gunzip.destroy(error);
    return super.destroy(error);
  }
}

/**
 * Creates an enhanced gzip stream
 */
export function createEnhancedGzip(options?: ZlibOptions): EnhancedGzip {
  return new EnhancedGzip(options);
}

/**
 * Creates an enhanced gunzip stream
 */
export function createEnhancedGunzip(options?: ZlibOptions): EnhancedGunzip {
  return new EnhancedGunzip(options);
}