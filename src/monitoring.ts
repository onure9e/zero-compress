// Monitoring utilities for zero-compress
// Memory monitoring, logging, and operational metrics

import { MAX_MEMORY_USAGE_MB, MEMORY_CHECK_INTERVAL } from './constants';
import * as crypto from 'crypto';

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

/**
 * Memory usage monitor with configurable thresholds
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private bufferPool: any; // Will be imported from buffers
  private lastCheckTime: number = 0;
  private checkInterval: number = MEMORY_CHECK_INTERVAL;

  constructor() {
    this.initialMemory = process.memoryUsage();
    // Buffer pool will be injected or created
  }

  /**
   * Checks memory usage and throws if limit exceeded
   */
  checkMemoryUsage(): void {
    // Skip memory monitoring in production for performance (unless explicitly enabled)
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_MEMORY_MONITORING) {
      return;
    }

    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return; // Skip frequent checks for performance
    }
    this.lastCheckTime = now;

    const current = process.memoryUsage();
    const increase = current.heapUsed - this.initialMemory.heapUsed;
    const maxUsage = MAX_MEMORY_USAGE_MB * 1024 * 1024;

    if (increase > maxUsage) {
      throw new Error(`Memory usage exceeded limit: ${increase} bytes (max: ${maxUsage})`);
    }
  }

  /**
   * Gets memory increase since monitor creation
   */
  getMemoryIncrease(): number {
    const current = process.memoryUsage();
    return current.heapUsed - this.initialMemory.heapUsed;
  }

  /**
   * Gets detailed memory statistics
   */
  getMemoryStats(): {
    used: number;
    available: number;
    limit: number;
    increase: number;
    efficiency: number;
  } {
    const current = process.memoryUsage();
    const increase = current.heapUsed - this.initialMemory.heapUsed;
    const limit = MAX_MEMORY_USAGE_MB * 1024 * 1024;
    const efficiency = Math.max(0, 1 - (increase / limit));

    return {
      used: current.heapUsed,
      available: current.heapTotal - current.heapUsed,
      limit,
      increase,
      efficiency
    };
  }
}

/**
 * Structured logger for operational monitoring with correlation tracking
 */
export class CompressionLogger {
  private correlationId: string;
  private startTime: number;
  private logLevel: LogLevel;
  private operationStack: string[] = [];

  constructor(correlationId?: string) {
    this.correlationId = correlationId || this.generateCorrelationId();
    this.startTime = Date.now();
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  /**
   * Logs operation start with context
   */
  start(operation: string, metadata: LogMetadata = {}): void {
    this.operationStack.push(operation);
    this.log('info', operation, 'start', {
      operationStack: [...this.operationStack],
      ...metadata
    });
  }

  /**
   * Logs operation completion with performance metrics
   */
  complete(operation: string, result: CompressionResult, metadata: LogMetadata = {}): void {
    const duration = Date.now() - this.startTime;
    const popped = this.operationStack.pop();

    if (popped !== operation) {
      this.warn(operation, `Operation stack mismatch: expected ${operation}, got ${popped}`, {
        expected: operation,
        actual: popped,
        stack: [...this.operationStack]
      });
    }

    this.log('info', operation, 'complete', {
      duration,
      result,
      operationStack: [...this.operationStack],
      throughput: result.originalSize / (duration / 1000), // bytes per second
      ...metadata
    });
  }

  /**
   * Logs errors with comprehensive context
   */
  error(operation: string, error: Error, metadata: LogMetadata = {}): void {
    const duration = Date.now() - this.startTime;
    const errorContext = {
      name: error.name,
      message: error.message,
      code: (error as any).code,
      errno: (error as any).errno,
      stack: this.logLevel >= LogLevel.DEBUG ? error.stack : undefined,
      operationStack: [...this.operationStack],
      duration,
      ...metadata
    };

    this.log('error', operation, 'error', errorContext);

    // Reset operation stack on error
    this.operationStack = [];
  }

  /**
   * Logs warnings with context
   */
  warn(operation: string, message: string, metadata: LogMetadata = {}): void {
    this.log('warn', operation, 'warning', {
      message,
      operationStack: [...this.operationStack],
      ...metadata
    });
  }

  /**
   * Logs debug information
   */
  debug(operation: string, metadata: LogMetadata = {}): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.log('debug', operation, 'debug', {
        operationStack: [...this.operationStack],
        memoryUsage: process.memoryUsage(),
        ...metadata
      });
    }
  }

  /**
   * Logs performance metrics
   */
  performance(operation: string, metrics: PerformanceMetricsData, metadata: LogMetadata = {}): void {
    this.log('info', operation, 'performance', {
      metrics,
      operationStack: [...this.operationStack],
      ...metadata
    });
  }

  /**
   * Creates a child logger with inherited context
   */
  child(childCorrelationId?: string): CompressionLogger {
    const childLogger = new CompressionLogger(childCorrelationId || this.correlationId);
    childLogger.operationStack = [...this.operationStack];
    return childLogger;
  }

  /**
   * Gets current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  private log(level: LogLevelString, operation: string, phase: string, metadata: LogMetadata): void {
    if (this.logLevel < this.parseLogLevel(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      phase,
      correlationId: this.correlationId,
      hostname: require('os').hostname(),
      pid: process.pid,
      ...metadata
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `zcmp_${timestamp}_${random}`;
  }
}

// Type definitions for structured logging
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export type LogLevelString = 'error' | 'warn' | 'info' | 'debug';

export interface LogMetadata {
  [key: string]: any;
}

export interface LogEntry extends LogMetadata {
  timestamp: string;
  level: LogLevelString;
  operation: string;
  phase: string;
  correlationId: string;
  hostname: string;
  pid: number;
}

export interface PerformanceMetricsData {
  duration: number;
  throughput: number;
  memoryDelta: number;
  cpuUsage?: number;
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Starts timing an operation
   */
  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  /**
   * Ends timing and records the metric
   */
  end(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.recordMetric(operation, duration);
    this.startTimes.delete(operation);

    return duration;
  }

  /**
   * Records a metric value
   */
  recordMetric(name: string, value: number): void {
    let values = this.metrics.get(name);
    if (!values) {
      values = [];
      this.metrics.set(name, values);
    }
    values.push(value);

    // Keep only last 1000 measurements to prevent memory growth
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Gets statistics for a metric
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const avg = values.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, avg, min, max, p95, p99 };
  }

  /**
   * Gets all metrics
   */
  getAllStats(): { [name: string]: any } {
    const stats: { [name: string]: any } = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Global instances
export const memoryMonitor = new MemoryMonitor();
export const performanceMetrics = new PerformanceMetrics();