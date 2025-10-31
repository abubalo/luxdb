import { ObjectLiteral } from '../types';

/**
 * Create a partial object with only specified keys
 * Used for selecting specific fields in queries
 * 
 * @param keys - Array of keys to extract
 * @param item - Source object
 * @returns New object with only specified keys
 */
export function createItemFromKeys(
  keys: string[],
  item: ObjectLiteral
): ObjectLiteral {
  const result: ObjectLiteral = {};
  
  for (const key of keys) {
    if (key in item) {
      result[key] = item[key];
    }
  }
  
  return result;
}

/**
 * Get values for specified keys from an object
 * 
 * @param keys - Array of keys to extract
 * @param item - Source object
 * @returns Array of values in the same order as keys
 */
export function getKeyChainValues(
  keys: string[],
  item: ObjectLiteral
): unknown[] {
  return keys.map(key => item[key]);
}

// import { ObjectLiteral } from '../types';

// /**
//  * Create a new object by selecting specific keys from a source object
//  * based on a provided list of key chains.
//  *
//  * @param {string[]} keys - An array of key chains to select from the source object.
//  * @param {ObjectLiteral} data - The source object from which to select keys.
//  * @returns {ObjectLiteral} - A new object containing selected keys and their values.
//  * @throws {Error} If a key in the key chain does not exist in the source object.
//  */
// export const createItemFromKeys = (keys: string[], data: ObjectLiteral): ObjectLiteral => {
//   const partialItem: ObjectLiteral = {};

//   keys.forEach((keyChain) => {
//     let target = partialItem;
//     let source = data;

//     keyChain.split('.').forEach((key, index, parts) => {
//       const value = source[key] as ObjectLiteral;

//       if (value === undefined) {
//         throw new Error(`Key ${key} does not exist in ${JSON.stringify(source)}`);
//       }

//       const isLastKey = index == parts.length - 1;
//       target[key] = target[key] ?? (isLastKey ? value : Array.isArray(value) ? [] : {});
//       target = target[key] as ObjectLiteral;
//       source = value;
//     });
//   });

//   return partialItem;
// };
