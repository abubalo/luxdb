# LuxDB

![GitHub](https://img.shields.io/github/license/abubalo/lux-db)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![latest](https://img.shields.io/badge/lastest-2.0.0-yellow)
[![NPM Downloads](https://img.shields.io/npm/dw/lux-db)](https://www.npmjs.com/package/lux-db)


A lightweight, type-safe JSON database for Node.js with a fluent query interface and ACID-compliant transactions.

## Features

**Type-Safe**: Full TypeScript support with generics  
**Fluent Queries**: Intuitive query builder with multiple syntax styles  
**ACID Transactions**: Atomic operations with automatic rollback  
**Concurrency Control**: Built-in locking to prevent race conditions  
**Zero Dependencies**: No external libraries (except Node.js built-ins)  
**Easy to Use**: Simple API that's easy to learn

## Installation

```bash
npm install luxdb
```

## Quick Start

```typescript
import { LuxDB } from 'luxdb';

// Define your data structure
interface User {
  id: string;
  name: string;
  age: number;
  status: 'active' | 'inactive';
}

const db = await LuxDB.create<User>('users');

await db.insert({ id: '1', name: 'Alice', age: 25, status: 'active' });

const user = await db.getOne().where({ name: 'Alice' });
const adults = await db.getAll().where('age', '>=', 18);

await db.updateOne({ status: 'inactive' }).where('id', '=', '1');

await db.deleteOne().where('id', '=', '1');
```

## Query Syntax

LuxDB supports multiple query syntaxes for flexibility:

### Object Syntax (Recommended for Simple Queries)

```typescript
// Single condition
await db.getOne().where({ name: 'Alice' });

// Multiple conditions
await db.getAll().where({ status: 'active', age: 25 });
```

### Operator Syntax (For Complex Queries)

```typescript
// Comparison operators
await db.getAll().where('age', '>', 18);
await db.getAll().where('age', '<=', 65);
await db.getAll().where('name', '!=', 'Alice');

// IN operator
await db.getAll().where('status', 'in', ['active', 'pending']);

// BETWEEN operator
await db.getAll().where('age', 'between', [18, 65]);

// MATCHES operator (regex)
await db.getAll().where('email', 'matches', /.*@example\.com$/);
```

### Hybrid Syntax (Mix Both Styles)

```typescript
await db.getAll()
  .where({ status: 'active' })
  .where('age', '>', 25);
```

### Available Operators

| Operator | Symbol | Example |
|----------|--------|---------|
| Equals | `=` | `.where('age', '=', 25)` |
| Not Equal | `!=` | `.where('status', '!=', 'inactive')` |
| Greater Than | `>` | `.where('age', '>', 18)` |
| Less Than | `<` | `.where('age', '<', 65)` |
| Greater or Equal | `>=` | `.where('age', '>=', 18)` |
| Less or Equal | `<=` | `.where('age', '<=', 65)` |
| In | `in` | `.where('status', 'in', ['active', 'pending'])` |
| Between | `between` | `.where('age', 'between', [18, 65])` |
| Matches | `matches` | `.where('email', 'matches', /pattern/)` |

## Field Selection

Select specific fields instead of returning entire objects:

```typescript
// Get only name and email
const users = await db.getAll('name', 'email').where({ status: 'active' });
// Returns: [{ name: 'Alice', email: 'alice@example.com' }, ...]

// Single field
const names = await db.getAll('name');
// Returns: [{ name: 'Alice' }, { name: 'Bob' }, ...]
```

## Transactions

Perform multiple operations atomically with automatic rollback on failure:

```typescript
const tx = await db.beginTransaction();

try {
  // Add operations
  tx.insert({ id: '1', name: 'Alice', age: 25, status: 'active' });
  tx.update(user => user.id === '2', { status: 'active' });
  tx.delete(user => user.age < 18);
  
  // Commit all changes atomically
  await tx.commit();
} catch (error) {
  // Automatic rollback on error
  await tx.rollback();
}
```

## API Reference

### LuxDB Methods

#### `LuxDB.create<T>(fileName, destination?)`
Create and initialize a new database instance.

```typescript
const db = await LuxDB.create<User>('users', './data');
```

#### `insert(item | items[])`
Insert one or more items.

```typescript
await db.insert({ id: '1', name: 'Alice' });
await db.insert([{ id: '2', name: 'Bob' }, { id: '3', name: 'Charlie' }]);
```

#### `getOne(...fields?)`
Find a single item. Returns `null` if not found.

```typescript
const user = await db.getOne().where({ id: '1' });
const userInfo = await db.getOne('name', 'email').where({ id: '1' });
```

#### `getAll(...fields?)`
Find all matching items. Returns empty array if none found.

```typescript
const users = await db.getAll().where({ status: 'active' });
const names = await db.getAll('name').where({ status: 'active' });
```

#### `updateOne(updates)`
Update a single matching item. Returns the updated item or `null`.

```typescript
const updated = await db.updateOne({ status: 'inactive' })
  .where('id', '=', '1');
```

#### `updateAll(updates)`
Update all matching items. Returns array of updated items.

```typescript
const updated = await db.updateAll({ status: 'active' })
  .where('age', '>=', 18);
```

#### `deleteOne()`
Delete a single matching item. Returns the deleted item or `null`.

```typescript
const deleted = await db.deleteOne().where('id', '=', '1');
```

#### `deleteAll()`
Delete all matching items. Returns array of deleted items.

```typescript
const deleted = await db.deleteAll().where({ status: 'inactive' });
```

#### `beginTransaction()`
Start a new transaction.

```typescript
const tx = await db.beginTransaction();
```

#### `clear()`
Delete all data from the database. **Use with caution!**

```typescript
await db.clear();
```

#### `size`
Get the number of items in the database.

```typescript
console.log(`Database has ${db.size} items`);
```

### Transaction Methods

#### `insert(item | items[])`
Add insert operation to transaction.

#### `update(predicate, updates)`
Add update operation to transaction.

#### `delete(predicate)`
Add delete operation to transaction.

#### `commit()`
Commit all operations atomically.

#### `rollback()`
Rollback all operations and restore original state.

## Error Handling

LuxDB provides specific error types for different scenarios:

```typescript
import { 
  DatabaseError,
  FileNotFoundError,
  TransactionError,
  LockError 
} from 'luxdb';

try {
  await db.insert({ id: '1', name: 'Alice' });
} catch (error) {
  if (error instanceof LockError) {
    console.error('Failed to acquire lock');
  } else if (error instanceof DatabaseError) {
    console.error('Database operation failed:', error.message);
  }
}
```
## Architecture

LuxDB follows clean architecture principles:

- **Separation of Concerns**: Database logic, storage, and queries are separated
- **SOLID Principles**: Each class has a single responsibility
- **Concurrency Control**: Mutex locks prevent race conditions
- **ACID Compliance**: Transactions ensure data integrity

## Performance Considerations

- **In-Memory**: All data is kept in memory for fast access
- **Lazy Write**: Data is written to disk only when modified
- **Locking**: Ensures data consistency but may impact concurrent writes
- **JSON Serialization**: Uses native JSON.stringify/parse for efficiency

## Limitations

- **Not for Large Datasets**: Best for small to medium datasets (< 100k items)
- **No Indexing Yet**: Sequential search for queries (O(n) complexity)
- **Single File**: All data in one JSON file
- **No Sharding**: Not designed for distributed systems
- **Node.js Only**: Requires Node.js filesystem APIs

## Future Enhancements

- [ ] Indexing for faster queries
- [ ] Query optimization
- [ ] Compression support
- [ ] Schema validation
- [ ] Migrations
- [ ] Backup/restore utilities
- [ ] Watch mode for real-time updates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](/LICENSE) - see LICENSE file for details
