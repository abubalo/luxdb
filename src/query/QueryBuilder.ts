import { Matcher, KeyChain } from '../types';

type OperatorSymbol = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'between' | 'matches';
type WhereValue<T> = Partial<T> | { [K in keyof T]?: T[K] | { $gt?: T[K]; $lt?: T[K]; $gte?: T[K]; $lte?: T[K]; $in?: T[K][]; $between?: [T[K], T[K]]; $matches?: string | RegExp } };

export class QueryBuilder<T, R> {
  private matchers: Matcher<T>[] = [];

  constructor(
    private executor: (matchers: Matcher<T>[]) => Promise<R>
  ) {}

  /**
   * Add a WHERE condition. Supports multiple syntaxes:
   * 
   * @example
   * // Object syntax (equals only)
   * .where({ name: 'Alice', age: 25 })
   * 
   * // Operator syntax
   * .where('age', '>', 25)
   * .where('status', 'in', ['active', 'pending'])
   */
  where(
    keyOrObject: KeyChain<T> | WhereValue<T>,
    operator?: OperatorSymbol,
    value?: unknown
  ): this {
    if (typeof keyOrObject === 'object') {
      this.addObjectConditions(keyOrObject);
      return this;
    }

    if (operator && value !== undefined) {
      this.matchers.push({
        key: keyOrObject,
        comparator: this.operatorToComparator(operator),
        value
      });
      return this;
    }

    throw new Error('Invalid where syntax');
  }

  private addObjectConditions(conditions: WhereValue<T>): void {
    for (const [key, value] of Object.entries(conditions)) {
      // Handle MongoDB-style operators
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case '$gt':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 2, value: opValue });
              break;
            case '$lt':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 3, value: opValue });
              break;
            case '$gte':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 4, value: opValue });
              break;
            case '$lte':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 5, value: opValue });
              break;
            case '$in':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 6, value: opValue });
              break;
            case '$between':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 7, value: opValue });
              break;
            case '$matches':
              this.matchers.push({ key: key as KeyChain<T>, comparator: 8, value: opValue });
              break;
          }
        }
      } else {
        // Simple equality
        this.matchers.push({ key: key as KeyChain<T>, comparator: 0, value });
      }
    }
  }

  private operatorToComparator(operator: OperatorSymbol): number {
    const map: Record<OperatorSymbol, number> = {
      '=': 0,
      '!=': 1,
      '>': 2,
      '<': 3,
      '>=': 4,
      '<=': 5,
      'in': 6,
      'between': 7,
      'matches': 8
    };
    return map[operator];
  }

  then<TResult>(
    onfulfilled?: (value: R) => TResult | PromiseLike<TResult>,
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    return this.executor(this.matchers).then(onfulfilled, onrejected);
  }

  catch<TResult>(
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>
  ): Promise<R | TResult> {
    return this.executor(this.matchers).catch(onrejected);
  }

  async execute(): Promise<R> {
    return this.executor(this.matchers);
  }
}