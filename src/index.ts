

export { ObjectLiteral, KeyChain, Comparator, Matcher, Config, Lock, Storage } from './types';
/**
 * LuxDB - A simple, type-safe JSON database for Node.js
 *
 * @example
 * import { LuxDB } from 'luxdb';
 *
 * interface User {
 *   id: string;
 *   name: string;
 *   age: number;
 * }
 *
 * const db = await LuxDB.create<User>('users');
 * await db.insert({ id: '1', name: 'Alice', age: 25 });
 * const user = await db.getOne().where({ name: 'Alice' });
 */

// Main database class
export { LuxDB } from './lib/LuxDB';
export { luxdb, autoId, uuid, shortId, timestampId, prefixId } from './luxdb';

// Transaction support
export { Transaction } from './lib/Transaction';

// Query builder
export { QueryBuilder } from './query/QueryBuilder';

// Errors
export { DatabaseError, FileNotFoundError, TransactionError, LockError, ValidationError } from './customError/Errors';

// Storage implementations
export { FileStore } from './storage/FileStore';
export { Mutex } from './storage/Lock';

// Utilities (may be useful for advanced users)
export { matchDataKeyValue } from './utils/match-data-key-value';
export { createItemFromKeys, getKeyChainValues } from './utils/create-items-from-keys';
