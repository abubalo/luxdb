import crypto from 'crypto';

/**
 * ID Generation utilities
 */

/**
 * Generate a cryptographically secure random ID
 * 
 * @param length - Length of the ID in bytes (default: 10)
 * @returns Hexadecimal string ID
 * 
 * @example
 * const id = autoId(); // "a3f9b2c1d4e5f6a7b8c9d0"
 * const shortId = autoId(5); // "a3f9b2c1d4"
 */
export function autoId(length = 10): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a UUID v4
 * 
 * @returns Standard UUID string
 * 
 * @example
 * const id = uuid(); // "123e4567-e89b-12d3-a456-426614174000"
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Generate a short, URL-safe ID
 * Uses base64url encoding for compact IDs
 * 
 * @param length - Length in bytes (default: 8, produces ~11 char string)
 * @returns URL-safe base64 string
 * 
 * @example
 * const id = shortId(); // "a3f9b2c1d4e"
 */
export function shortId(length = 8): string {
  return crypto.randomBytes(length)
    .toString('base64url')
    .replace(/[+/=]/g, '')
    .substring(0, length * 1.3);
}

/**
 * Generate a timestamp-based ID (sortable)
 * Combines timestamp with random suffix for uniqueness
 * 
 * @returns Sortable ID string
 * 
 * @example
 * const id1 = timestampId(); // "1699123456789-a3f9b2"
 * const id2 = timestampId(); // "1699123456790-d4e5f6" (sorts after id1)
 */
export function timestampId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(3).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Generate a readable ID with prefix
 * Useful for different entity types
 * 
 * @param prefix - Prefix for the ID (e.g., 'user', 'post')
 * @param length - Length of random part (default: 8)
 * @returns Prefixed ID string
 * 
 * @example
 * const userId = prefixId('user'); // "user_a3f9b2c1d4e5f6a7"
 * const postId = prefixId('post'); // "post_b4e6c3d5f7a8b9c0"
 */
export function prefixId(prefix: string, length = 8): string {
  const id = crypto.randomBytes(length).toString('hex');
  return `${prefix}_${id}`;
}

/**
 * Generate a nano ID (similar to nanoid library)
 * Compact and URL-safe
 * 
 * @param size - Size of the ID (default: 21)
 * @returns Nano ID string
 * 
 * @example
 * const id = nanoId(); // "V1StGXR8_Z5jdHi6B-myT"
 */
export function nanoId(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = crypto.randomBytes(size);
  let id = '';
  
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  
  return id;
}

/**
 * Generate a ULID (Universally Unique Lexicographically Sortable Identifier)
 * Timestamp-based and sortable
 * 
 * @returns ULID string
 * 
 * @example
 * const id = ulid(); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 */
export function ulid(): string {
  const timestamp = Date.now();
  const timestampPart = timestamp.toString(36).toUpperCase().padStart(10, '0');
  const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
  return timestampPart + randomPart;
}

/**
 * Automatically add IDs to items that don't have one
 * 
 * @param items - Single item or array of items
 * @param generator - ID generator function (default: autoId)
 * @returns Items with IDs added
 * 
 * @example
 * const user = withId({ name: 'Alice' }); // { id: "...", name: 'Alice' }
 * const users = withId([{ name: 'Bob' }, { name: 'Charlie' }]);
 */
export function withId<T extends object>(
  items: T | T[],
  generator: () => string = autoId
): (T & { id: string }) | (T & { id: string })[] {
  const addId = (item: T): T & { id: string } => {
    if ('id' in item && item.id) {
      return item as T & { id: string };
    }
    return { ...item, id: generator() };
  };

  return Array.isArray(items) 
    ? items.map(addId) 
    : addId(items);
}

/**
 * Validation helpers
 */

/**
 * Check if a value is a valid ID format
 * 
 * @param id - ID to validate
 * @returns True if valid
 */
export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.trim() === id;
}

/**
 * Type guard to check if object has an id field
 */
export function hasId<T extends object>(item: T): item is T & { id: string } {
  return 'id' in item && isValidId(item.id);
}