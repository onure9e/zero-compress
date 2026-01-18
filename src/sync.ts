import * as zlib from 'zlib';
import { validateInput, getMaxDecompressedSize, COMPRESSION_MODE } from './utils';

export function gzipSync(data: Buffer | string): Buffer {
  validateInput(data);
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;

  if (COMPRESSION_MODE === 'performance') {
    // Maximum speed - no security checks, fastest zlib settings
    return zlib.gzipSync(buffer, { level: 1, memLevel: 8, windowBits: 15, strategy: 0 });
  }

  return zlib.gzipSync(buffer, { level: 6 }); // Balanced
}

export function gunzipSync(data: Buffer): Buffer {
  validateInput(data);
  return zlib.gunzipSync(data, { maxOutputLength: getMaxDecompressedSize() });
}

export function deflateSync(data: Buffer | string): Buffer {
  validateInput(data);
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;

  if (COMPRESSION_MODE === 'performance') {
    return zlib.deflateSync(buffer, { level: 1, memLevel: 8, windowBits: 15, strategy: 0 });
  }

  return zlib.deflateSync(buffer, { level: 6 });
}

export function inflateSync(data: Buffer): Buffer {
  validateInput(data);
  return zlib.inflateSync(data, { maxOutputLength: getMaxDecompressedSize() });
}

export function deflateRawSync(data: Buffer | string): Buffer {
  validateInput(data);
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;

  if (COMPRESSION_MODE === 'performance') {
    return zlib.deflateRawSync(buffer, { level: 1, memLevel: 8, windowBits: 15, strategy: 0 });
  }

  return zlib.deflateRawSync(buffer, { level: 6 });
}

export function inflateRawSync(data: Buffer): Buffer {
  validateInput(data);
  return zlib.inflateRawSync(data, { maxOutputLength: getMaxDecompressedSize() });
}