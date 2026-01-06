// Stream enhancements for zero-compress
// Provides improved stream handling with better error management

import { Transform } from 'stream';
import * as zlib from 'zlib';
import type { ZlibOptions } from 'zlib';

/**
 * Enhanced Gzip stream with better error handling
 */
export class EnhancedGzip extends Transform {
  private gzip: zlib.Gzip;

  constructor(options?: ZlibOptions) {
    super();
    this.gzip = zlib.createGzip(options);

    this.gzip.on('data', (chunk) => this.push(chunk));
    this.gzip.on('end', () => this.push(null));
    this.gzip.on('error', (err) => this.emit('error', err));
  }

  _transform(chunk: Buffer, encoding: BufferEncoding | undefined, callback: Function) {
    this.gzip.write(chunk, callback as any);
  }

  _flush(callback: Function) {
    this.gzip.end(callback);
  }
}

/**
 * Enhanced Gunzip stream with better error handling
 */
export class EnhancedGunzip extends Transform {
  private gunzip: zlib.Gunzip;

  constructor(options?: ZlibOptions) {
    super();
    this.gunzip = zlib.createGunzip(options);

    this.gunzip.on('data', (chunk) => this.push(chunk));
    this.gunzip.on('end', () => this.push(null));
    this.gunzip.on('error', (err) => this.emit('error', err));
  }

  _transform(chunk: Buffer, encoding: BufferEncoding | undefined, callback: Function) {
    this.gunzip.write(chunk, callback as any);
  }

  _flush(callback: Function) {
    this.gunzip.end(callback);
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