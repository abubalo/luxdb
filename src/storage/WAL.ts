// src/storage/WAL.ts

import { readFile, writeFile, appendFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { DatabaseError } from '../customError/Errors';

/**
 * Operation types for Write-Ahead Log
 */
export enum OperationType {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BEGIN = 'BEGIN',
  COMMIT = 'COMMIT',
  ROLLBACK = 'ROLLBACK'
}

/**
 * Log entry structure
 */
export interface LogEntry<T = any> {
  timestamp: number;
  type: OperationType;
  data?: T | T[] | any; // Allow arrays or any data structure
  transactionId?: string;
}

/**
 * Write-Ahead Log implementation for durability and crash recovery
 * 
 * Benefits:
 * - Crash recovery: Replay uncommitted operations on startup
 * - Durability: Changes logged before applied
 * - Performance: Append-only writes are faster than full rewrites
 */
export class WAL<T> {
  private walPath: string;
  private checkpointThreshold = 100; // Checkpoint after N operations

  constructor(dbPath: string) {
    this.walPath = `${dbPath}.wal`;
  }

  /**
   * Log an operation to the WAL file
   * Operations are appended for performance
   */
  async log(entry: LogEntry<T>): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await appendFile(this.walPath, logLine, 'utf-8');
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to write to WAL: ${error.message}`,
        'WAL_WRITE_ERROR'
      );
    }
  }

  /**
   * Log a transaction begin
   */
  async logBegin(transactionId: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.BEGIN,
      transactionId
    });
  }

  /**
   * Log a transaction commit
   */
  async logCommit(transactionId: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.COMMIT,
      transactionId
    });
  }

  /**
   * Log a transaction rollback
   */
  async logRollback(transactionId: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.ROLLBACK,
      transactionId
    });
  }

  /**
   * Log an insert operation
   */
  async logInsert(data: T | T[], transactionId?: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.INSERT,
      data: data as unknown, // Cast to avoid type issues
      transactionId
    });
  }

  /**
   * Log an update operation
   */
  async logUpdate(data: Partial<T> | any, transactionId?: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.UPDATE,
      data: data as unknown,
      transactionId
    });
  }

  /**
   * Log a delete operation
   */
  async logDelete(data: any, transactionId?: string): Promise<void> {
    await this.log({
      timestamp: Date.now(),
      type: OperationType.DELETE,
      data: data as any,
      transactionId
    });
  }

  /**
   * Read all log entries from the WAL file
   */
  async readLog(): Promise<LogEntry<T>[]> {
    if (!existsSync(this.walPath)) {
      return [];
    }

    try {
      const content = await readFile(this.walPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      return lines.map(line => JSON.parse(line));
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to read WAL: ${error.message}`,
        'WAL_READ_ERROR'
      );
    }
  }

  /**
   * Replay uncommitted operations from the WAL
   * Called on database initialization for crash recovery
   * 
   * @returns Array of operations to replay
   */
  async replay(): Promise<LogEntry<T>[]> {
    const entries = await this.readLog();
    const uncommitted: LogEntry<T>[] = [];
    const transactions = new Map<string, LogEntry<T>[]>();

    for (const entry of entries) {
      // Track transaction state
      if (entry.transactionId) {
        if (entry.type === OperationType.BEGIN) {
          transactions.set(entry.transactionId, []);
        } else if (entry.type === OperationType.COMMIT) {
          transactions.delete(entry.transactionId);
        } else if (entry.type === OperationType.ROLLBACK) {
          transactions.delete(entry.transactionId);
        } else {
          // Add operation to transaction
          const txOps = transactions.get(entry.transactionId) || [];
          txOps.push(entry);
          transactions.set(entry.transactionId, txOps);
        }
      } else {
        // Non-transactional operation
        if (entry.type !== OperationType.BEGIN && 
            entry.type !== OperationType.COMMIT && 
            entry.type !== OperationType.ROLLBACK) {
          uncommitted.push(entry);
        }
      }
    }

    // Return uncommitted operations
    const result: LogEntry<T>[] = [...uncommitted];
    for (const ops of transactions.values()) {
      result.push(...ops);
    }

    return result;
  }

  /**
   * Checkpoint: Clear the WAL after successful data persistence
   * Called after data is safely written to the main database file
   */
  async checkpoint(): Promise<void> {
    try {
      if (existsSync(this.walPath)) {
        await writeFile(this.walPath, '', 'utf-8');
      }
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to checkpoint WAL: ${error.message}`,
        'WAL_CHECKPOINT_ERROR'
      );
    }
  }

  /**
   * Get the number of entries in the WAL
   */
  async getSize(): Promise<number> {
    const entries = await this.readLog();
    return entries.length;
  }

  /**
   * Check if WAL needs checkpointing
   */
  async needsCheckpoint(): Promise<boolean> {
    const size = await this.getSize();
    return size >= this.checkpointThreshold;
  }

  /**
   * Delete the WAL file completely
   * Use with caution - only for cleanup
   */
  async destroy(): Promise<void> {
    try {
      if (existsSync(this.walPath)) {
        await unlink(this.walPath);
      }
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to destroy WAL: ${error.message}`,
        'WAL_DESTROY_ERROR'
      );
    }
  }
}