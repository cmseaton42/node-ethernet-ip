/**
 * Generic state machine with type-safe state unions and optional transition validation.
 *
 * T must be a narrow string literal union (e.g. 'red' | 'green'), not plain `string`.
 *
 * Transition rules:
 *   - Omit config entirely → any transition allowed
 *   - Provide config → only declared transitions allowed (strict)
 *   - `exits`: from a state, which states it can go to
 *   - `entries`: which states can reach this state
 *   - `'*'` means unrestricted on that side
 *   - A transition passes if either `exits` or `entries` allows it
 *
 * Handler ordering: change handlers fire in registration order after state updates.
 */

type NarrowString<T> = T extends string & (string extends T ? never : unknown) ? T : never;

export interface TransitionRules<T extends string> {
  exits?: Partial<Record<T, T[] | '*'>>;
  entries?: Partial<Record<T, T[] | '*'>>;
}

export class StateMachine<T extends string & (string extends T ? never : unknown)> {
  private _state: NarrowString<T>;
  private _previous?: NarrowString<T>;
  private readonly rules?: TransitionRules<T>;
  private readonly changeHandlers: ((prev: T | undefined, current: T) => void)[] = [];

  constructor(initialState: T, rules?: TransitionRules<T>) {
    this._state = initialState as NarrowString<T>;
    this.rules = rules;
  }

  get state(): T {
    return this._state;
  }

  get previous(): T | undefined {
    return this._previous;
  }

  setState(next: T): void {
    if (next === this._state) return;
    if (!this.isAllowed(this._state, next)) {
      throw new Error(`Invalid transition: ${this._state} → ${next}`);
    }
    this._previous = this._state;
    this._state = next as NarrowString<T>;
    for (const h of this.changeHandlers) h(this._previous, this._state);
  }

  is(state: T): boolean {
    return this._state === state;
  }

  was(state: T | undefined): boolean {
    return this._previous === state;
  }

  onStateChange(handler: (prev: T | undefined, current: T) => void): void {
    this.changeHandlers.push(handler);
  }

  private isAllowed(from: T, to: T): boolean {
    if (!this.rules) return true;

    // Check exits: can `from` go to `to`?
    const exits = this.rules.exits?.[from];
    if (exits === '*' || (Array.isArray(exits) && exits.includes(to))) return true;

    // Check entries: can `to` be reached from `from`?
    const entries = this.rules.entries?.[to];
    if (entries === '*' || (Array.isArray(entries) && entries.includes(from))) return true;

    return false;
  }
}
