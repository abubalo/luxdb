import { LuxDB } from './LuxDB';
import type { LuxDBConfig } from './config';

/**
 * Instance manager for LuxDB
 * Provides singleton-like behavior while allowing multiple named instances
 *
 * Benefits:
 * - Reuse existing connections
 * - Prevent multiple instances of same database
 * - Better memory management
 */
class InstanceManager {
  private instances = new Map<string, LuxDB<any>>();

  /**
   * Get or create a database instance
   * Returns existing instance if already created, otherwise creates new one
   *
   * @param config - Database configuration
   * @returns Database instance
   *
   * @example
   * const db = await InstanceManager.get<User>({ fileName: 'users' });
   * const sameDb = await InstanceManager.get<User>({ fileName: 'users' }); // Returns same instance
   */
  async get<T extends object>(config: LuxDBConfig | string): Promise<LuxDB<T>> {
    // Support string shorthand
    const cfg: LuxDBConfig = typeof config === 'string' ? { fileName: config } : config;

    const key = this.getKey(cfg);

    if (this.instances.has(key)) {
      return this.instances.get(key) as LuxDB<T>;
    }

    // Create new instance
    const instance = await LuxDB.create<T>(cfg);
    this.instances.set(key, instance);
    return instance;
  }

  /**
   * Create a new instance even if one exists
   * Useful for testing or when you need separate connections
   *
   * @param config - Database configuration
   * @returns New database instance
   */
  async createNew<T extends object>(config: LuxDBConfig | string): Promise<LuxDB<T>> {
    const cfg: LuxDBConfig = typeof config === 'string' ? { fileName: config } : config;

    return await LuxDB.create<T>(cfg);
  }

  /**
   * Check if an instance exists for given config
   */
  has(config: LuxDBConfig | string): boolean {
    const cfg: LuxDBConfig = typeof config === 'string' ? { fileName: config } : config;

    const key = this.getKey(cfg);
    return this.instances.has(key);
  }

  /**
   * Remove an instance from cache
   * Useful for cleanup or forcing recreation
   */
  remove(config: LuxDBConfig | string): boolean {
    const cfg: LuxDBConfig = typeof config === 'string' ? { fileName: config } : config;

    const key = this.getKey(cfg);
    return this.instances.delete(key);
  }

  /**
   * Clear all instances
   * Useful for testing cleanup
   */
  clear(): void {
    this.instances.clear();
  }

  /**
   * Get the number of active instances
   */
  get size(): number {
    return this.instances.size;
  }

  /**
   * Get all instance keys
   */
  keys(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Generate a unique key for a database instance
   */
  private getKey(config: LuxDBConfig): string {
    const destination = config.destination || 'db';
    return `${destination}/${config.fileName}`;
  }
}

// Export singleton instance
export const instanceManager = new InstanceManager();
