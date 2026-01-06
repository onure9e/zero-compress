// Promise-based async APIs for zero-compress
// Provides modern async/await support for zlib operations

import * as zlib from 'zlib';

// Optimized Promise-based versions without promisify overhead
export const gzipAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.gzip(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const gunzipAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const deflateAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.deflate(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const inflateAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.inflate(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const deflateRawAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const inflateRawAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.inflateRaw(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const brotliCompressAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.brotliCompress(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const brotliDecompressAsync = (buf: zlib.InputType, options?: zlib.ZlibOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    zlib.brotliDecompress(buf, options as any, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Type definitions for the promisified functions
export interface GzipOptions extends zlib.ZlibOptions {}
export interface GunzipOptions extends zlib.ZlibOptions {}
export interface DeflateOptions extends zlib.ZlibOptions {}
export interface InflateOptions extends zlib.ZlibOptions {}
export interface DeflateRawOptions extends zlib.ZlibOptions {}
export interface InflateRawOptions extends zlib.ZlibOptions {}