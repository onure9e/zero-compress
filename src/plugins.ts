// Plugin architecture for zero-compress
// Extensible system for custom compression algorithms and processors

import type { CompressionResult } from './constants';
import type { CompressionLogger } from './monitoring';

export interface CompressionPlugin {
  name: string;
  version: string;
  description?: string;

  // Plugin capabilities
  supportsCompression: boolean;
  supportsDecompression: boolean;
  supportedFormats?: string[];

  // Core methods
  compress?(data: Buffer, options?: any): Promise<Buffer>;
  decompress?(data: Buffer, options?: any): Promise<Buffer>;

  // Metadata
  getMetadata?(): PluginMetadata;

  // Lifecycle
  initialize?(context: PluginContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface PluginMetadata {
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  engines?: { [key: string]: string };
}

export interface PluginContext {
  logger: CompressionLogger;
  config: any;
  registry: PluginRegistry;
}

export interface PluginRegistration {
  plugin: CompressionPlugin;
  priority: number; // Higher priority plugins are tried first
  enabled: boolean;
}

/**
 * Plugin registry for managing compression plugins
 */
export class PluginRegistry {
  private plugins: Map<string, PluginRegistration> = new Map();
  private initialized = false;

  /**
   * Registers a new compression plugin
   */
  register(plugin: CompressionPlugin, priority: number = 0): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    this.plugins.set(plugin.name, {
      plugin,
      priority,
      enabled: true
    });
  }

  /**
   * Unregisters a plugin
   */
  unregister(name: string): void {
    const registration = this.plugins.get(name);
    if (registration) {
      // Shutdown plugin if initialized
      if (registration.plugin.shutdown) {
        registration.plugin.shutdown().catch(console.error);
      }
      this.plugins.delete(name);
    }
  }

  /**
   * Enables or disables a plugin
   */
  setEnabled(name: string, enabled: boolean): void {
    const registration = this.plugins.get(name);
    if (registration) {
      registration.enabled = enabled;
    }
  }

  /**
   * Gets all registered plugins
   */
  getAll(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Gets enabled plugins sorted by priority
   */
  getEnabled(): PluginRegistration[] {
    return Array.from(this.plugins.values())
      .filter(reg => reg.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Finds the best plugin for compression
   */
  findCompressionPlugin(format?: string): CompressionPlugin | null {
    const candidates = this.getEnabled()
      .filter(reg => reg.plugin.supportsCompression)
      .filter(reg => !format || reg.plugin.supportedFormats?.includes(format));

    return candidates.length > 0 ? candidates[0].plugin : null;
  }

  /**
   * Finds the best plugin for decompression
   */
  findDecompressionPlugin(data: Buffer): CompressionPlugin | null {
    // Try to detect format from data
    const detectedFormat = this.detectFormat(data);
    const candidates = this.getEnabled()
      .filter(reg => reg.plugin.supportsDecompression)
      .filter(reg => !detectedFormat || reg.plugin.supportedFormats?.includes(detectedFormat));

    return candidates.length > 0 ? candidates[0].plugin : null;
  }

  /**
   * Initializes all plugins
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) return;

    const enabledPlugins = this.getEnabled();

    for (const registration of enabledPlugins) {
      if (registration.plugin.initialize) {
        try {
          await registration.plugin.initialize(context);
          context.logger.debug('plugin_initialized', {
            plugin: registration.plugin.name,
            version: registration.plugin.version
          });
        } catch (error) {
          context.logger.error('plugin_initialization_failed', error as Error, {
            plugin: registration.plugin.name
          });
          // Disable failed plugin
          registration.enabled = false;
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Shuts down all plugins
   */
  async shutdown(): Promise<void> {
    const enabledPlugins = this.getEnabled();

    for (const registration of enabledPlugins) {
      if (registration.plugin.shutdown) {
        try {
          await registration.plugin.shutdown();
        } catch (error) {
          console.error(`Error shutting down plugin ${registration.plugin.name}:`, error);
        }
      }
    }

    this.initialized = false;
  }

  /**
   * Simple format detection from buffer magic bytes
   */
  private detectFormat(data: Buffer): string | null {
    if (data.length < 2) return null;

    // Gzip detection
    if (data[0] === 0x1F && data[1] === 0x8B) {
      return 'gzip';
    }

    // Zlib detection
    if ((data[0] & 0x0F) === 8 && ((data[0] >>> 4) & 0x0F) <= 7) {
      return 'zlib';
    }

    // Brotli detection (simplified)
    if (data[0] === 0xCE || data[0] === 0xCF) {
      return 'brotli';
    }

    return null;
  }
}

/**
 * Plugin-based compressor that uses registered plugins
 */
export class PluginCompressor {
  private registry: PluginRegistry;
  private logger: CompressionLogger;

  constructor(registry: PluginRegistry, logger: CompressionLogger) {
    this.registry = registry;
    this.logger = logger;
  }

  /**
   * Compresses data using the best available plugin
   */
  async compress(data: Buffer, format?: string, options?: any): Promise<CompressionResult> {
    const logger = this.logger.child();
    logger.start('plugin_compress', { size: data.length, format });

    try {
      const plugin = this.registry.findCompressionPlugin(format);
      if (!plugin) {
        throw new Error(`No suitable compression plugin found for format: ${format || 'auto'}`);
      }

      if (!plugin.compress) {
        throw new Error(`Plugin '${plugin.name}' does not support compression`);
      }

      logger.debug('plugin_selected', {
        plugin: plugin.name,
        version: plugin.version,
        format: format || 'auto'
      });

      const startTime = Date.now();
      const compressed = await plugin.compress(data, options);
      const duration = Date.now() - startTime;

      const result: CompressionResult = {
        originalSize: data.length,
        compressedSize: compressed.length,
        ratio: compressed.length / data.length,
        savings: (1 - compressed.length / data.length) * 100,
        time: duration
      };

      logger.complete('plugin_compress', result, {
        plugin: plugin.name,
        algorithm: format || 'auto'
      });

      return result;

    } catch (error) {
      logger.error('plugin_compress', error as Error);
      throw error;
    }
  }

  /**
   * Decompresses data using the best available plugin
   */
  async decompress(data: Buffer, options?: any): Promise<Buffer> {
    const logger = this.logger.child();
    logger.start('plugin_decompress', { size: data.length });

    try {
      const plugin = this.registry.findDecompressionPlugin(data);
      if (!plugin) {
        throw new Error('No suitable decompression plugin found');
      }

      if (!plugin.decompress) {
        throw new Error(`Plugin '${plugin.name}' does not support decompression`);
      }

      logger.debug('plugin_selected', {
        plugin: plugin.name,
        version: plugin.version
      });

      const decompressed = await plugin.decompress(data, options);

      logger.complete('plugin_decompress', {
        originalSize: data.length,
        compressedSize: 0, // Not applicable for decompression
        ratio: 0,
        savings: 0,
        time: 0
      }, {
        plugin: plugin.name,
        outputSize: decompressed.length
      });

      return decompressed;

    } catch (error) {
      logger.error('plugin_decompress', error as Error);
      throw error;
    }
  }
}

// Global plugin registry instance
export const pluginRegistry = new PluginRegistry();