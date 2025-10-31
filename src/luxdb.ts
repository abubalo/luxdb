import { LuxDB } from './lib/LuxDB';
import { instanceManager } from './lib/InstanceManager';
import { LuxDBConfig } from './lib/config';

/**
 * Create or get a database instance with elegant syntax
 * 
 * Usage patterns:
 * 1. Simple: luxdb('users')
 * 2. With path: luxdb('users', './data')
 * 3. With config: luxdb({ fileName: 'users', enableWAL: true })
 * 
 * @example
 * // Simple usage
 * const db = await luxdb<User>('users');
 * 
 * // With custom directory
 * const db = await luxdb<User>('users', './data');
 * 
 * // With full config
 * const db = await luxdb<User>({
 *   fileName: 'users',
 *   destination: './data',
 *   enableWAL: true,
 *   autoId: true
 * });
 */
export async function luxdb<T extends object>(
  fileNameOrConfig: string | LuxDBConfig,
  destination?: string
): Promise<LuxDB<T>> {
  let config: LuxDBConfig;

  if (typeof fileNameOrConfig === 'string') {
    config = {
      fileName: fileNameOrConfig,
      destination: destination,
    };
  } else {
    config = fileNameOrConfig;
  }

  // Create new instance (no singleton by default)
  return await LuxDB.create<T>(config);
}

/**
 * Get or create a singleton instance
 * Reuses existing instance if already created
 * 
 * @example
 * const db1 = await luxdb.get<User>('users');
 * const db2 = await luxdb.get<User>('users'); // Returns same instance
 */
luxdb.get = async function<T extends object>(
  fileNameOrConfig: string | LuxDBConfig,
  destination?: string
): Promise<LuxDB<T>> {
  let config: LuxDBConfig;

  if (typeof fileNameOrConfig === 'string') {
    config = {
      fileName: fileNameOrConfig,
      destination: destination,
    };
  } else {
    config = fileNameOrConfig;
  }

  return await instanceManager.get<T>(config);
};

/**
 * Create a new instance (bypasses singleton cache)
 * 
 * @example
 * const db = await luxdb.create<User>('users'); // Always new instance
 */
luxdb.create = async function<T extends object>(
  fileNameOrConfig: string | LuxDBConfig,
  destination?: string
): Promise<LuxDB<T>> {
  let config: LuxDBConfig;

  if (typeof fileNameOrConfig === 'string') {
    config = {
      fileName: fileNameOrConfig,
      destination: destination,
    };
  } else {
    config = fileNameOrConfig;
  }

  return await instanceManager.createNew<T>(config);
};

/**
 * Check if an instance exists in the cache
 * 
 * @example
 * if (luxdb.has('users')) {
 *   console.log('Users DB already loaded');
 * }
 */
luxdb.has = function(
  fileNameOrConfig: string | LuxDBConfig,
  destination?: string
): boolean {
  let config: LuxDBConfig;

  if (typeof fileNameOrConfig === 'string') {
    config = {
      fileName: fileNameOrConfig,
      destination: destination,
    };
  } else {
    config = fileNameOrConfig;
  }

  return instanceManager.has(config);
};

/**
 * Remove an instance from cache
 * 
 * @example
 * luxdb.remove('users'); // Force recreation on next get()
 */
luxdb.remove = function(
  fileNameOrConfig: string | LuxDBConfig,
  destination?: string
): boolean {
  let config: LuxDBConfig;

  if (typeof fileNameOrConfig === 'string') {
    config = {
      fileName: fileNameOrConfig,
      destination: destination,
    };
  } else {
    config = fileNameOrConfig;
  }

  return instanceManager.remove(config);
};

/**
 * Clear all cached instances
 * Useful for testing
 * 
 * @example
 * luxdb.clearAll(); // Remove all instances from cache
 */
luxdb.clearAll = function(): void {
  instanceManager.clear();
};

/**
 * Get statistics about cached instances
 * 
 * @example
 * console.log(luxdb.stats()); // { count: 3, instances: ['db/users', ...] }
 */
luxdb.stats = function() {
  return {
    count: instanceManager.size,
    instances: instanceManager.keys(),
  };
};

// Re-export everything for convenience
export * from './utils/helpers';
export { LuxDB } from './lib/LuxDB';
export { Transaction } from './lib/Transaction';
export { QueryBuilder } from './query/QueryBuilder';
export * from './types';
export * from './customError/Errors';
export type { LuxDBConfig } from './lib/config';