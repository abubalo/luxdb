/**
 * Generic object literal type
 */
export type ObjectLiteral = Record<string, unknown>;

/**
 * Key chain type for accessing nested properties
 */
export type KeyChain<T> = keyof T | string;

/**
 * Comparison operators enum
 */
export enum Comparator {
  Equals = 0,
  NotEqual = 1,
  GreaterThan = 2,
  LessThan = 3,
  GreaterOrEqual = 4,
  LessThanOrEqual = 5,
  In = 6,
  Between = 7,
  Matches = 8,
}

/**
 * Matcher interface for query conditions
 */
export interface Matcher<T> {
  key: KeyChain<T>;
  comparator: Comparator;
  value: unknown;
}

/**
 * Database configuration
 */
export interface Config {
  fileName: string;
  destination?: string;
  maxCacheSize?: number;
}

/**
 * Lock interface for concurrency control
 */
export interface Lock {
  acquire(): Promise<void>;
  release(): void;
  isLocked(): boolean;
}

/**
 * Storage interface for abstracting file operations
 */
export interface Storage<T> {
  read(): Promise<T[]>;
  write(data: T[]): Promise<void>;
  exists(): Promise<boolean>;
}