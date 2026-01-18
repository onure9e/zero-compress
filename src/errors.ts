/**
 * Custom error classes for better error handling and type safety
 */

export class CompressionError extends Error {
  constructor(message: string, public code: string, public context?: any) {
    super(message);
    this.name = 'CompressionError';
    Error.captureStackTrace(this, CompressionError);
  }
}

export class ValidationError extends CompressionError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    Error.captureStackTrace(this, ValidationError);
  }
}

export class SecurityError extends CompressionError {
  constructor(message: string, context?: any) {
    super(message, 'SECURITY_ERROR', context);
    Error.captureStackTrace(this, SecurityError);
  }
}

export class ConfigurationError extends CompressionError {
  constructor(message: string, context?: any) {
    super(message, 'CONFIGURATION_ERROR', context);
    Error.captureStackTrace(this, ConfigurationError);
  }
}

export class PerformanceError extends CompressionError {
  constructor(message: string, context?: any) {
    super(message, 'PERFORMANCE_ERROR', context);
    Error.captureStackTrace(this, PerformanceError);
  }
}

/**
 * Enhanced logging system with configurable verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static verbosity: LogLevel = LogLevel.INFO;

  static setVerbosity(level: LogLevel): void {
    this.verbosity = level;
  }

  static log(level: LogLevel, message: string, context?: any): void {
    if (level >= this.verbosity || process.env.DEBUG) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      const logMessage = `[${timestamp}] [${levelName}] ${message}`;

      if (context) {
        console.log(logMessage, context);
      } else {
        console.log(logMessage);
      }
    }
  }

  static debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  static info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  static warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  static error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }
}