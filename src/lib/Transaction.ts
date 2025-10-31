import { TransactionError } from '../customError/Errors';

/**
 * Transaction class implementing Unit of Work pattern
 * Allows multiple operations to be committed or rolled back atomically
 */
export class Transaction<T extends object> {
  private snapshot: string; // JSON snapshot for rollback
  private operations: Array<() => void> = [];
  private committed = false;
  private rolledBack = false;

  constructor(
    private getData: () => T[],
    private setData: (data: T[]) => void,
    private persist: () => Promise<void>,
    private releaseLock: () => void
  ) {
    // Capture current state as JSON for efficient rollback
    this.snapshot = JSON.stringify(this.getData());
  }

  /**
   * Add an insert operation to the transaction
   */
  insert(item: T | T[]): this {
    this.ensureNotFinalized();
    
    const items = Array.isArray(item) ? item : [item];
    this.operations.push(() => {
      const data = this.getData();
      data.push(...items);
    });
    
    return this;
  }

  /**
   * Add an update operation to the transaction
   * @param predicate - Function to find items to update
   * @param updates - Partial object with fields to update
   */
  update(
    predicate: (item: T) => boolean,
    updates: Partial<T>
  ): this {
    this.ensureNotFinalized();
    
    this.operations.push(() => {
      const data = this.getData();
      for (let i = 0; i < data.length; i++) {
        if (predicate(data[i])) {
          data[i] = { ...data[i], ...updates };
        }
      }
    });
    
    return this;
  }

  /**
   * Add a delete operation to the transaction
   * @param predicate - Function to find items to delete
   */
  delete(predicate: (item: T) => boolean): this {
    this.ensureNotFinalized();
    
    this.operations.push(() => {
      const data = this.getData();
      const filtered = data.filter(item => !predicate(item));
      this.setData(filtered);
    });
    
    return this;
  }

  /**
   * Commit all operations atomically
   * If any operation fails, automatically rolls back
   */
  async commit(): Promise<void> {
    this.ensureNotFinalized();

    try {
      // Apply all operations in memory
      for (const operation of this.operations) {
        operation();
      }

      // Persist to disk
      await this.persist();
      
      this.committed = true;
    } catch (error: any) {
      // Automatically rollback on failure
      await this.rollback();
      throw new TransactionError(
        `Transaction commit failed: ${error.message}`,
        { originalError: error }
      );
    } finally {
      // Always release lock
      this.releaseLock();
    }
  }

  /**
   * Rollback all operations and restore original state
   */
  async rollback(): Promise<void> {
    if (this.rolledBack) return;

    try {
      // Restore from snapshot
      const originalData = JSON.parse(this.snapshot);
      this.setData(originalData);
      
      this.rolledBack = true;
      this.operations = [];
    } finally {
      // Always release lock
      this.releaseLock();
    }
  }

  /**
   * Check if transaction has been finalized
   */
  isFinalized(): boolean {
    return this.committed || this.rolledBack;
  }

  /**
   * Get the number of pending operations
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Ensure transaction hasn't been committed or rolled back
   */
  private ensureNotFinalized(): void {
    if (this.committed) {
      throw new TransactionError('Transaction already committed');
    }
    if (this.rolledBack) {
      throw new TransactionError('Transaction already rolled back');
    }
  }
}