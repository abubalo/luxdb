import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { KeyChain, ObjectLiteral } from '../types';
import { DatabaseError } from '../customError/Errors';
import { FileStore } from '../storage/FileStore';
import { Mutex } from '../storage/Lock';
import { WAL, OperationType } from '../storage/WAL';
import { Transaction } from './Transaction';
import { QueryBuilder } from '../query/QueryBuilder';
import { createItemFromKeys } from '../utils/create-items-from-keys';
import { LuxDBConfig, mergeConfig, validateConfig } from './config';
import { withId, hasId } from '../utils/helpers';
import { matchDataKeyValue } from '../utils/match-data-key-value';

/**
 * LuxDB - A simple JSON-based database with query capabilities
 *
 * Features:
 * - ACID-compliant transactions
 * - Fluent query interface
 * - Concurrency control with locks
 * - Type-safe operations
 *
 * @template T - Type of the database items (must have an 'id' field)
 */
export class LuxDB<T extends object> {
  private data: T[] = [];
  private initialized = false;
  private readonly store: FileStore<T>;
  private readonly lock = new Mutex();
  private wal?: WAL<T>;
  private config: Required<LuxDBConfig>;

  /**
   * Private constructor - use static create() method instead
   */
  private constructor(
    private readonly filePath: string,
    config: LuxDBConfig,
  ) {
    this.config = mergeConfig(config);
    this.store = new FileStore<T>(filePath);

    if (!this.config.enableWAL) {
      this.wal = new WAL<T>(filePath);
    }
  }

  /**
   * Factory method to create a properly initialized LuxDB instance
   *
   * @param config - Database configuration (string or config object)
   * @returns Initialized LuxDB instance
   *
   * @example
   * // Simple usage
   * const db = await LuxDB.create<User>('users');
   *
   * // With config
   * const db = await LuxDB.create<User>({
   *   fileName: 'users',
   *   destination: './data',
   *   enableWAL: true,
   *   autoId: true
   * });
   */
  static async create<T extends object>(config: LuxDBConfig | string): Promise<LuxDB<T>> {
  
    const cfg: LuxDBConfig = typeof config === 'string' ? { fileName: config } : config;
    validateConfig(cfg);

    const mergedConfig = mergeConfig(cfg);
    const { fileName, destination } = mergedConfig;

    if (!existsSync(destination)) {
      try {
        mkdirSync(destination, { recursive: true });
      } catch (error: any) {
        throw new DatabaseError(`Failed to create directory: ${destination}`, 'DIR_CREATE_ERROR', {
          originalError: error.message,
        });
      }
    }

    const filePath = path.join(destination, `${fileName}.json`);
    const db = new LuxDB<T>(filePath, cfg);

    await db.init();

    return db;
  }

  /**
   * Initialize the database by loading data from disk
   * Creates the file if it doesn't exist
   */
  private async init(): Promise<void> {
    if (this.initialized) return;

    await this.lock.acquire();
    try {
      // Initialize file if it doesn't exist
      await this.store.initialize();

      // Load data
      this.data = await this.store.read();
      this.initialized = true;
    } finally {
      this.lock.release();
    }
  }

  /**
   * Persist current data to disk
   */
  private async persist(): Promise<void> {
    await this.store.write(this.data);
  }

  /**
   * Get the current number of items in the database
   */
  get size(): number {
    return this.data.length;
  }

  /**
   * Get all data (useful for debugging)
   * Returns a copy to prevent external modification
   */
  getData(): T[] {
    return [...this.data];
  }

  /**
   * Insert one or more items into the database
   *
   * @param items - Single item or array of items to insert
   * @returns The inserted items
   *
   * @example
   * await db.insert({ id: '1', name: 'Alice' });
   * await db.insert([{ id: '2', name: 'Bob' }, { id: '3', name: 'Charlie' }]);
   */
  async insert(items: T | T[]): Promise<T | T[]> {
    await this.init();
    await this.lock.acquire();

    try {
      const itemsArray = Array.isArray(items) ? items : [items];
      this.data.push(...itemsArray);
      await this.persist();
      return items;
    } finally {
      this.lock.release();
    }
  }

  /**
   * Find a single item matching the query conditions
   *
   * @param keys - Optional: specific fields to return
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * // Get entire user
   * const user = await db.getOne().where({ name: 'Alice' });
   *
   * // Get specific fields
   * const userInfo = await db.getOne('name', 'email').where('id', '=', '123');
   */
  getOne(...keys: KeyChain<T>[]): QueryBuilder<T, T | Partial<T> | null> {
    return new QueryBuilder(async (matchers) => {
      await this.init();

      const item = this.data.find((item) =>
        matchers.every((matcher) => {
          return matchDataKeyValue(item, matcher);
        }),
      );

      if (!item) return null;

      if (keys.length) {
        return createItemFromKeys(keys as string[], item as ObjectLiteral) as Partial<T>;
      }
      return item;
    });
  }

  /**
   * Find all items matching the query conditions
   *
   * @param keys - Optional: specific fields to return
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * // Get all active users
   * const users = await db.getAll().where({ status: 'active' });
   *
   * // Get all users older than 18
   * const adults = await db.getAll().where('age', '>', 18);
   *
   * // Get specific fields only
   * const names = await db.getAll('name').where({ status: 'active' });
   */
  getAll(...keys: KeyChain<T>[]): QueryBuilder<T, T[] | Partial<T>[]> {
    return new QueryBuilder(async (matchers) => {
      await this.init();

      let items = this.data;

      if (matchers.length) {
        items = items.filter((item) => matchers.every((matcher) => matchDataKeyValue(item, matcher)));
      }

      if (keys.length) {
        return items.map((item) => createItemFromKeys(keys as string[], item as ObjectLiteral) as Partial<T>);
      }
      return items;
    });
  }

  /**
   * Update a single item matching the query conditions
   *
   * @param updates - Partial object with fields to update
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * await db.updateOne({ status: 'inactive' }).where('id', '=', '123');
   */
  updateOne(updates: Partial<T>): QueryBuilder<T, T | null> {
    return new QueryBuilder(async (matchers) => {
      await this.init();
      await this.lock.acquire();

      try {
        // const { matchDataKeyValue } = await import('../utils/match-data-key-value');
        const index = this.data.findIndex((item) => matchers.every((matcher) => matchDataKeyValue(item, matcher)));

        if (index >= 0) {
          this.data[index] = { ...this.data[index], ...updates };
          await this.persist();
          return this.data[index];
        }
        return null;
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Update all items matching the query conditions
   *
   * @param updates - Partial object with fields to update
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * await db.updateAll({ status: 'archived' }).where('createdAt', '<', oldDate);
   */
  updateAll(updates: Partial<T>): QueryBuilder<T, T[]> {
    return new QueryBuilder(async (matchers) => {
      await this.init();
      await this.lock.acquire();

      try {
        const updated: T[] = [];
        // const { matchDataKeyValue } = await import('../utils/match-data-key-value');

        this.data = this.data.map((item) => {
          if (matchers.every((matcher) => matchDataKeyValue(item, matcher))) {
            const updatedItem = { ...item, ...updates };
            updated.push(updatedItem);
            return updatedItem;
          }
          return item;
        });

        if (updated.length) {
          await this.persist();
        }
        return updated;
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Delete a single item matching the query conditions
   *
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * const deleted = await db.deleteOne().where('id', '=', '123');
   */
  deleteOne(): QueryBuilder<T, T | null> {
    return new QueryBuilder(async (matchers) => {
      await this.init();
      await this.lock.acquire();

      try {
        // const { matchDataKeyValue } = await import('../utils/match-data-key-value');
        const index = this.data.findIndex((item) => matchers.every((matcher) => matchDataKeyValue(item, matcher)));

        if (index >= 0) {
          const [deleted] = this.data.splice(index, 1);
          await this.persist();
          return deleted;
        }
        return null;
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Delete all items matching the query conditions
   *
   * @returns QueryBuilder for fluent query interface
   *
   * @example
   * const deleted = await db.deleteAll().where('status', '=', 'inactive');
   */
  deleteAll(): QueryBuilder<T, T[]> {
    return new QueryBuilder(async (matchers) => {
      await this.init();
      await this.lock.acquire();

      try {
        const deleted: T[] = [];
        // const { matchDataKeyValue } = await import('../utils/match-data-key-value');

        this.data = this.data.filter((item) => {
          const shouldDelete = matchers.every((matcher) => matchDataKeyValue(item, matcher));
          if (shouldDelete) {
            deleted.push(item);
            return false;
          }
          return true;
        });

        if (deleted.length) {
          await this.persist();
        }
        return deleted;
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Begin a new transaction for atomic operations
   *
   * @returns Transaction instance
   *
   * @example
   * const tx = await db.beginTransaction();
   * tx.insert({ id: '1', name: 'Alice' });
   * tx.update(user => user.id === '2', { status: 'active' });
   * await tx.commit(); // All or nothing
   */
  async beginTransaction(): Promise<Transaction<T>> {
    await this.init();
    await this.lock.acquire();

    return new Transaction<T>(
      () => this.data,
      (newData) => {
        this.data = newData;
      },
      () => this.persist(),
      () => this.lock.release(),
    );
  }

  /**
   * Clear all data from the database
   * USE WITH CAUTION!
   */
  async clear(): Promise<void> {
    await this.init();
    await this.lock.acquire();

    try {
      this.data = [];
      await this.persist();
    } finally {
      this.lock.release();
    }
  }
}
