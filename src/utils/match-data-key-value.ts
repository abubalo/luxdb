import { Matcher, Comparator } from '../types';

/**
 * Match a data item against a matcher condition
 * Supports various comparison operators
 */
export function matchDataKeyValue<T>(item: T, matcher: Matcher<T>): boolean {
  const { key, comparator, value } = matcher;
  const itemValue = (item as any)[key];

  switch (comparator) {
    case Comparator.Equals:
      return itemValue === value;

    case Comparator.NotEqual:
      return itemValue !== value;

    case Comparator.GreaterThan:
      return Number(itemValue) > Number(value);

    case Comparator.LessThan:
      return Number(itemValue) < Number(value);

    case Comparator.GreaterOrEqual:
      return Number(itemValue) >= Number(value);

    case Comparator.LessThanOrEqual:
      return Number(itemValue) <= Number(value);

    case Comparator.In:
      return Array.isArray(value) && value.includes(itemValue);

    case Comparator.Between:
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        return itemValue >= min && itemValue <= max;
      }
      return false;

    case Comparator.Matches:
      if (typeof itemValue !== 'string') return false;
      if (value instanceof RegExp) {
        return value.test(itemValue);
      }
      if (typeof value === 'string') {
        return new RegExp(value).test(itemValue);
      }
      return false;

    default:
      return false;
  }
}