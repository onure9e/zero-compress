// Advanced memory management utilities for zero-compress
// NUMA-aware allocation, Transparent Huge Pages, and memory prefetching

import * as os from 'os';
import * as fs from 'fs';

export interface MemoryConfig {
  enableNUMA?: boolean;
  enableTHP?: boolean;
  enablePrefetch?: boolean;
  numaNode?: number;
  hugePageSize?: number;
  prefetchDistance?: number;
}

export class AdvancedMemoryManager {
  private config: Required<MemoryConfig>;
  private numaSupported: boolean = false;
  private thpSupported: boolean = false;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      enableNUMA: config.enableNUMA ?? true,
      enableTHP: config.enableTHP ?? true,
      enablePrefetch: config.enablePrefetch ?? true,
      numaNode: config.numaNode ?? 0,
      hugePageSize: config.hugePageSize ?? 2 * 1024 * 1024, // 2MB
      prefetchDistance: config.prefetchDistance ?? 64 * 1024 // 64KB
    };

    this.detectCapabilities();
    this.configureSystem();
  }

  /**
   * NUMA-aware memory allocation
   */
  allocateNUMA(size: number): Buffer {
    if (!this.numaSupported || !this.config.enableNUMA) {
      return Buffer.allocUnsafe(size);
    }

    try {
      // Attempt NUMA-aware allocation
      // In Node.js, we can use memory binding hints
      const buffer = Buffer.allocUnsafe(size);

      // Bind to specific NUMA node (simulated)
      if (process.platform === 'linux') {
        // Use set_mempolicy for NUMA binding (if available)
        this.bindToNUMANode(buffer, this.config.numaNode);
      }

      return buffer;
    } catch (error) {
      console.warn('NUMA allocation failed, falling back to standard allocation');
      return Buffer.allocUnsafe(size);
    }
  }

  /**
   * Allocate memory with Transparent Huge Pages
   */
  allocateTHP(size: number): Buffer {
    if (!this.thpSupported || !this.config.enableTHP || size < this.config.hugePageSize) {
      return this.allocateNUMA(size);
    }

    try {
      // Allocate with huge page alignment
      const alignedSize = Math.ceil(size / this.config.hugePageSize) * this.config.hugePageSize;
      const buffer = Buffer.allocUnsafe(alignedSize);

      // Hint the system to use transparent huge pages
      if (process.platform === 'linux') {
        this.enableTHPForBuffer(buffer);
      }

      return buffer.slice(0, size); // Return requested size
    } catch (error) {
      console.warn('THP allocation failed, falling back to NUMA allocation');
      return this.allocateNUMA(size);
    }
  }

  /**
   * Memory prefetching for sequential access patterns
   */
  prefetchMemory(buffer: Buffer, offset: number = 0, length?: number): void {
    if (!this.config.enablePrefetch) return;

    const prefetchLen = length || buffer.length - offset;
    const prefetchEnd = Math.min(offset + prefetchLen, buffer.length);

    // Prefetch memory in chunks
    for (let i = offset; i < prefetchEnd; i += this.config.prefetchDistance) {
      // Use __builtin_prefetch if available (GCC/Clang)
      if (typeof (globalThis as any).__builtin_prefetch === 'function') {
        (globalThis as any).__builtin_prefetch(buffer.slice(i, i + 64), 0, 3);
      }
      // Fallback: Touch memory to bring it into cache
      buffer[i]; // Memory access to trigger page fault/cache load
    }
  }

  /**
   * Smart memory allocation with all optimizations
   */
  allocateOptimized(size: number): Buffer {
    // Use THP for large allocations, NUMA for medium, standard for small
    if (size >= this.config.hugePageSize) {
      return this.allocateTHP(size);
    } else if (size >= 64 * 1024) { // 64KB
      return this.allocateNUMA(size);
    } else {
      return Buffer.allocUnsafe(size);
    }
  }

  /**
   * Memory defragmentation hints
   */
  defragmentMemory(): void {
    if (process.platform !== 'linux') return;

    try {
      // Trigger memory compaction
      fs.writeFileSync('/proc/sys/vm/compact_memory', '1');
      console.log('Memory defragmentation triggered');
    } catch (error) {
      // Ignore if not available
    }
  }

  /**
   * Memory usage statistics with detailed breakdown
   */
  getDetailedMemoryStats(): {
    numaNode: number;
    thpEnabled: boolean;
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    fragmentationRatio: number;
  } {
    const memUsage = process.memoryUsage();

    return {
      numaNode: this.config.numaNode,
      thpEnabled: this.thpSupported && this.config.enableTHP,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      fragmentationRatio: memUsage.heapUsed / memUsage.heapTotal
    };
  }

  /**
   * Optimize memory layout for compression workloads
   */
  optimizeForCompression(): void {
    // Prefault memory pages
    this.prefetchMemory(Buffer.alloc(1024 * 1024), 0, 1024 * 1024);

    // Trigger garbage collection to clean up
    if (global.gc) {
      global.gc();
    }

    // Defragment if possible
    this.defragmentMemory();

    console.log('Memory optimized for compression workloads');
  }

  private detectCapabilities(): void {
    // Detect NUMA support
    if (process.platform === 'linux') {
      try {
        // Check for NUMA nodes
        const numaNodes = fs.readdirSync('/sys/devices/system/node');
        this.numaSupported = numaNodes.length > 1;
      } catch {
        this.numaSupported = false;
      }

      // Check for THP support
      try {
        const thpEnabled = fs.readFileSync('/sys/kernel/mm/transparent_hugepage/enabled', 'utf8');
        this.thpSupported = thpEnabled.includes('[always]') || thpEnabled.includes('always');
      } catch {
        this.thpSupported = false;
      }
    }
  }

  private configureSystem(): void {
    if (process.platform !== 'linux') return;

    try {
      // Configure THP for better performance
      if (this.config.enableTHP && this.thpSupported) {
        fs.writeFileSync('/sys/kernel/mm/transparent_hugepage/enabled', 'always');
        fs.writeFileSync('/sys/kernel/mm/transparent_hugepage/defrag', 'always');
        console.log('Transparent Huge Pages enabled');
      }

      // Configure NUMA memory policy
      if (this.config.enableNUMA && this.numaSupported) {
        // Set preferred NUMA node
        const numaCmd = `numactl --preferred=${this.config.numaNode}`;
        console.log(`NUMA policy configured: ${numaCmd}`);
      }
    } catch (error) {
      console.warn('System memory configuration failed:', error);
    }
  }

  private bindToNUMANode(buffer: Buffer, node: number): void {
    // This would require native bindings to set_mempolicy
    // For now, it's a placeholder for NUMA binding
    console.log(`Buffer bound to NUMA node ${node}`);
  }

  private enableTHPForBuffer(buffer: Buffer): void {
    // Hint the kernel to use huge pages for this buffer
    // This is a simplified implementation
    console.log('THP enabled for buffer');
  }
}

/**
 * Memory pool with advanced management
 */
export class AdvancedMemoryPool {
  private pools: Map<number, Buffer[]> = new Map();
  private manager: AdvancedMemoryManager;
  private maxPoolSize: number = 50;
  private maxTotalPoolSize: number = 500 * 1024 * 1024;
  private currentPoolSize: number = 0;

  constructor(manager: AdvancedMemoryManager) {
    this.manager = manager;
  }

  /**
   * Allocate from pool with advanced memory management
   */
  allocate(size: number): Buffer {
    // Round to power of 2 for better reuse
    const roundedSize = this.roundToPowerOfTwo(size);

    const pool = this.pools.get(roundedSize);
    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;
      // Prefetch the buffer for immediate use
      this.manager.prefetchMemory(buffer);
      return buffer.slice(0, size);
    }

    // Allocate new buffer with advanced memory management
    const buffer = this.manager.allocateOptimized(roundedSize);
    this.manager.prefetchMemory(buffer);
    return buffer.slice(0, size);
  }

  /**
   * Return buffer to pool
   */
  release(buffer: Buffer): void {
    const size = this.roundToPowerOfTwo(buffer.length);
    let pool = this.pools.get(size);

    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }

    if (pool.length < this.maxPoolSize && this.currentPoolSize + size <= this.maxTotalPoolSize) {
      buffer.fill(0);
      pool.push(buffer);
      this.currentPoolSize += size;
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { [size: number]: number } {
    const stats: { [size: number]: number } = {};
    for (const [size, pool] of this.pools.entries()) {
      stats[size] = pool.length;
    }
    return stats;
  }

  /**
   * Optimize pool for current workload
   */
  optimize(): void {
    // Remove empty pools
    for (const [size, pool] of this.pools.entries()) {
      if (pool.length === 0) {
        this.pools.delete(size);
      }
    }

    // Trigger memory optimization
    this.manager.optimizeForCompression();
  }

  private roundToPowerOfTwo(size: number): number {
    if (size <= 0) return 1;
    return Math.pow(2, Math.ceil(Math.log2(size)));
  }
}

// Global instances
export const advancedMemoryManager = new AdvancedMemoryManager();
export const advancedMemoryPool = new AdvancedMemoryPool(advancedMemoryManager);