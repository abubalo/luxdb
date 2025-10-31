
export class StackTraceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StackTraceError';
    Error.captureStackTrace(this, this.constructor); // Capture the stack trace
  }
}



export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: number | string = -1,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends DatabaseError {
  constructor(
    public filePath: string,
    code: string = 'ENOENT'
  ) {
    super(`File not found: ${filePath}`, code);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown during transaction operations
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

/**
 * Error thrown when a lock cannot be acquired
 */
export class LockError extends DatabaseError {
  constructor(message: string = 'Failed to acquire lock') {
    super(message, 'LOCK_ERROR');
    this.name = 'LockError';
  }
}

/**
 * Error thrown during validation
 */
export class ValidationError extends DatabaseError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}
