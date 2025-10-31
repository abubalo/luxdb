
export interface LuxDBConfig {
  /** Database file name (without .json extension) */
  fileName: string;
  
  /** Directory where database files are stored */
  destination?: string;
  
  /** Enable Write-Ahead Log for durability and crash recovery */
  enableWAL?: boolean;
  
  /** Number of WAL entries before automatic checkpoint */
  walCheckpointThreshold?: number;
  
  /** Lock acquisition timeout in milliseconds */
  lockTimeout?: number;
  
  /** Auto-generate IDs for items without an 'id' field */
  autoId?: boolean;
  
  /** Custom ID generator function */
  idGenerator?: () => string;
  
  /** Pretty-print JSON output (2-space indentation) */
  prettyPrint?: boolean;
  
  /** Validate data before operations (future feature) */
  validate?: boolean;
  
  /** Schema for validation (future feature) */
  schema?: any;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<Omit<LuxDBConfig, 'fileName' | 'schema' | 'idGenerator'>> = {
  destination: 'db',
  enableWAL: true,
  walCheckpointThreshold: 100,
  lockTimeout: 5000,
  autoId: true,
  prettyPrint: true,
  validate: false,
};

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: LuxDBConfig): Required<LuxDBConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    schema: userConfig.schema || null,
    idGenerator: userConfig.idGenerator || defaultIdGenerator,
  };
}

/**
 * Default ID generator using crypto
 */
export function defaultIdGenerator(): string {
  // Use crypto for secure random IDs
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomPart}`;
}

/**
 * Validate configuration
 */
export function validateConfig(config: LuxDBConfig): void {
  if (!config.fileName) {
    throw new Error('fileName is required in config');
  }

  if (config.fileName.includes('/') || config.fileName.includes('\\')) {
    throw new Error('fileName should not contain path separators');
  }

  if (config.walCheckpointThreshold && config.walCheckpointThreshold < 1) {
    throw new Error('walCheckpointThreshold must be at least 1');
  }

  if (config.lockTimeout && config.lockTimeout < 100) {
    throw new Error('lockTimeout must be at least 100ms');
  }
}