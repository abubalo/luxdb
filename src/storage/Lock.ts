import { Lock } from '../types';
import { LockError } from '../customError/Errors';

/**
 * Mutex implementation for concurrency control
 * Prevents race conditions during read/write operations
 */
export class Mutex implements Lock {
  private locked = false;
  private queue: Array<() => void> = [];
  private timeout = 5000; // 5 second timeout

  /**
   * Check if the lock is currently held
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Acquire the lock. If already locked, wait in queue.
   * @throws {LockError} If timeout is reached
   */
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.queue.indexOf(resolve);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
        reject(new LockError('Lock acquisition timeout'));
      }, this.timeout);

      this.queue.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Release the lock and wake up next waiter in queue
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Force release the lock and clear all waiters
   * Use with caution - only for emergency cleanup
   */
  forceRelease(): void {
    this.locked = false;
    this.queue = [];
  }

  /**
   * Get the number of operations waiting for the lock
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}