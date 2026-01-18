// Buffer management utilities for zero-compress
// Memory-efficient buffer pooling and allocation strategies

import { MAX_CHUNK_SIZE } from './constants';

// Pre-computed CRC32 table for performance
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}

// Fast bit operation for power of 2
function fastRoundToPowerOfTwo(size: number): number {
  if (size <= 0) return 1;
  return 1 << (32 - Math.clz32(size - 1));
}

/**
 * Buffer pool for memory reuse and GC pressure reduction
 */
export class BufferPool {
  private pools: Map<number, Buffer[]> = new Map();
  private maxPoolSize: number = 100;
  private maxTotalSize: number = 50 * 1024 * 1024;
  private currentSize: number = 0;

  /**
   * Allocates a buffer from pool or creates new one
   */
  allocate(size: number): Buffer {
    const roundedSize = fastRoundToPowerOfTwo(size);

    const pool = this.pools.get(roundedSize);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }

    return Buffer.allocUnsafe(roundedSize);
  }

  /**
   * Returns buffer to pool for reuse
   */
  release(buffer: Buffer): void {
    const roundedSize = fastRoundToPowerOfTwo(buffer.length);

    let pool = this.pools.get(roundedSize);
    if (!pool) {
      pool = [];
      this.pools.set(roundedSize, pool);
    }

    if (pool.length < this.maxPoolSize && this.currentSize + roundedSize <= this.maxTotalSize) {
      buffer.fill(0);
      pool.push(buffer);
      this.currentSize += roundedSize;
    }
  }

  /**
   * Gets pool statistics
   */
  getStats(): { [size: number]: number } {
    const stats: { [size: number]: number } = {};
    for (const [size, pool] of this.pools.entries()) {
      stats[size] = pool.length;
    }
    return stats;
  }

  /**
   * Clears all pooled buffers (for cleanup)
   */
  clear(): void {
    this.pools.clear();
    this.currentSize = 0;
  }
}

/**
 * Memory-efficient buffer operations
 */
export class BufferOperations {
  private pool = new BufferPool();

  /**
   * Fast buffer comparison using SIMD-like operations
   */
  fastCompare(a: Buffer, b: Buffer, maxLen?: number): number {
    const len = maxLen || Math.min(a.length, b.length);
    if (a.length < len || b.length < len) return -1;

    // SIMD-like comparison using 32-bit chunks when possible
    const uint32ViewA = new Uint32Array(a.buffer, a.byteOffset, len >> 2);
    const uint32ViewB = new Uint32Array(b.buffer, b.byteOffset, len >> 2);

    for (let i = 0; i < uint32ViewA.length; i++) {
      if (uint32ViewA[i] !== uint32ViewB[i]) {
        return uint32ViewA[i] < uint32ViewB[i] ? -1 : 1;
      }
    }

    // Handle remaining bytes
    const remainder = len & 3;
    const start = len - remainder;
    for (let i = 0; i < remainder; i++) {
      if (a[start + i] !== b[start + i]) {
        return a[start + i] < b[start + i] ? -1 : 1;
      }
    }

    return 0;
  }

  /**
   * Fast pattern search with pooled buffers
   */
  findPattern(haystack: Buffer, needle: Buffer, maxOccurrences: number = 10): number[] {
    const positions: number[] = [];
    const needleLen = needle.length;

    if (needleLen === 0 || haystack.length < needleLen) {
      return positions;
    }

    // Use Boyer-Moore for larger patterns, simple search for small ones
    if (needleLen <= 8) {
      this.simplePatternSearch(haystack, needle, positions, maxOccurrences);
    } else {
      this.boyerMooreSearch(haystack, needle, positions, maxOccurrences);
    }

    return positions;
  }

  /**
   * Splits buffer into chunks for parallel processing
   */
  splitIntoChunks(data: Buffer, chunkSize: number = MAX_CHUNK_SIZE): Buffer[] {
    const chunks: Buffer[] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, Math.min(i + chunkSize, data.length)));
    }
    return chunks;
  }

  /**
   * Combines chunks back into single buffer
   */
  combineChunks(chunks: Buffer[]): Buffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = this.pool.allocate(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      chunk.copy(result, offset);
      offset += chunk.length;
    }

    return result.slice(0, totalLength);
  }

  /**
   * Memory-efficient CRC32 calculation using pre-computed table
   */
  fastCRC32(data: Buffer): number {
    let crc = 0xFFFFFFFF;

    const len = data.length;
    const uint32View = new Uint32Array(data.buffer, data.byteOffset, len >> 2);

    for (let i = 0; i < uint32View.length; i++) {
      const value = uint32View[i];
      crc = CRC32_TABLE[(crc ^ (value & 0xFF)) & 0xFF] ^ (crc >>> 8);
      crc = CRC32_TABLE[(crc ^ ((value >>> 8) & 0xFF)) & 0xFF] ^ (crc >>> 8);
      crc = CRC32_TABLE[(crc ^ ((value >>> 16) & 0xFF)) & 0xFF] ^ (crc >>> 8);
      crc = CRC32_TABLE[(crc ^ ((value >>> 24) & 0xFF)) & 0xFF] ^ (crc >>> 8);
    }

    const remainder = len & 3;
    for (let i = len - remainder; i < len; i++) {
      crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  private simplePatternSearch(haystack: Buffer, needle: Buffer, positions: number[], maxOccurrences: number): void {
    const needleLen = needle.length;
    if (needleLen === 0 || haystack.length < needleLen) return;

    const maxShift = haystack.length - needleLen;
    const firstByte = needle[0];

    for (let i = 0; i <= maxShift && positions.length < maxOccurrences; i++) {
      if (haystack[i] !== firstByte) continue;

      let match = true;
      for (let j = 1; j < needleLen; j++) {
        if (haystack[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        positions.push(i);
      }
    }
  }

  private boyerMooreSearch(haystack: Buffer, needle: Buffer, positions: number[], maxOccurrences: number): void {
    const needleLen = needle.length;
    const badCharTable = new Uint8Array(256);

    // Initialize bad character table
    for (let i = 0; i < 256; i++) {
      badCharTable[i] = needleLen;
    }
    for (let i = 0; i < needleLen - 1; i++) {
      badCharTable[needle[i]] = needleLen - 1 - i;
    }

    let i = 0;
    while (i <= haystack.length - needleLen && positions.length < maxOccurrences) {
      let j = needleLen - 1;
      while (j >= 0 && haystack[i + j] === needle[j]) {
        j--;
      }

      if (j < 0) {
        positions.push(i);
        i += needleLen;
      } else {
        i += Math.max(1, badCharTable[haystack[i + j]]);
      }
    }
  }
}

// Legacy export functions for backward compatibility
export function fastBufferCompare(a: Buffer, b: Buffer, maxLen?: number): boolean {
  return bufferOps.fastCompare(a, b, maxLen) === 0;
}

export function fastPatternSearch(buffer: Buffer, pattern: Buffer, maxOccurrences: number = 10): number[] {
  return bufferOps.findPattern(buffer, pattern, maxOccurrences);
}

export function fastChecksum(buffer: Buffer): number {
  return bufferOps.fastCRC32(buffer);
}

// Global instances
export const bufferPool = new BufferPool();
export const bufferOps = new BufferOperations();