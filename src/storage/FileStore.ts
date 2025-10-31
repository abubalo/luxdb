import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { Storage } from '../types';
import { DatabaseError, FileNotFoundError } from '../customError/Errors'; 
import { Mutex } from './Lock';

/**
 * File-based storage implementation
 * Handles all disk I/O operations with proper locking
 */
export class FileStore<T> implements Storage<T> {
  private writeLock = new Mutex();

  constructor(private filePath: string) {}

  /**
   * Check if the database file exists
   */
  async exists(): Promise<boolean> {
    try {
      await access(this.filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read data from the file
   * @throws {DatabaseError} If parsing fails
   * @returns Empty array if file doesn't exist
   */
  async read(): Promise<T[]> {
    try {
      const fileContent = await readFile(this.filePath, 'utf-8');
      
      // Handle empty file
      if (!fileContent.trim()) {
        return [];
      }

      return JSON.parse(fileContent);
    } catch (error: any) {
      // File doesn't exist - return empty array
      if (error.code === 'ENOENT') {
        return [];
      }

      // JSON parse error
      if (error instanceof SyntaxError) {
        throw new DatabaseError(
          `Failed to parse JSON in file: ${this.filePath}`,
          'PARSE_ERROR',
          { originalError: error.message }
        );
      }

      // Other errors
      throw new DatabaseError(
        `Failed to read file: ${this.filePath}`,
        error.code || 'READ_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Write data to the file with proper locking
   * Ensures only one write operation happens at a time
   * @throws {DatabaseError} If write fails
   */
  async write(data: T[]): Promise<void> {
    await this.writeLock.acquire();

    try {
      const content = JSON.stringify(data, null, 2);
      await writeFile(this.filePath, content, 'utf-8');
    } catch (error: any) {
      let errorMessage = `Failed to write to file: ${this.filePath}`;
      let errorCode = 'WRITE_ERROR';

      switch (error.code) {
        case 'ENOENT':
          errorMessage = `Directory does not exist for file: ${this.filePath}`;
          errorCode = 'ENOENT';
          break;
        case 'ENOSPC':
          errorMessage = `No space left on device for file: ${this.filePath}`;
          errorCode = 'ENOSPC';
          break;
        case 'EACCES':
          errorMessage = `Permission denied for file: ${this.filePath}`;
          errorCode = 'EACCES';
          break;
      }

      throw new DatabaseError(errorMessage, errorCode, {
        originalError: error.message
      });
    } finally {
      this.writeLock.release();
    }
  }

  /**
   * Initialize the file with empty array if it doesn't exist
   */
  async initialize(): Promise<void> {
    const fileExists = await this.exists();
    if (!fileExists) {
      await this.write([]);
    }
  }
}