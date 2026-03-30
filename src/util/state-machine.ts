/**
 * Generic state machine with type-safe state unions and optional transition validation.
 *
 * T must be a narrow string literal union (e.g. 'red' | 'green'), not plain `string`.
 *
 * Transition map rules:
 *   - Omit map entirely → any transition allowed
 *   - `{ connected: ['disconnecting'] }` → connected can only go to disconnecting
 *   - `{ connected: '*' }` → connected can go to any state
 *   - `{ '*': ['disconnected'] }` → any state can go to disconnected
 *
 * Handler ordering: change handlers fire in registration order after state updates.
 */

type NarrowString<T> = T extends string & (string extends T ? never : unknown) ? T : never;

type TransitionMap<T extends string> = Partial<Record<T | '*', T[] | '*'>>;

export class StateMachine<T extends string & (string extends T ? never : unknown)> {
  private _state: NarrowString<T>;
  private _previous?: NarrowString<T>;
  private readonly transitions?: TransitionMap<T>;
  private readonly changeHandlers: ((prev: T | undefined, current: T) => void)[] = [];

  constructor(initialState: T, transitions?: TransitionMap<T>) {
    this._state = initialState as NarrowString<T>;
    this.transitions = transitions;
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
    if (!this.transitions) return true;
    const specific = this.transitions[from as T | '*'];
    if (specific === '*' || (Array.isArray(specific) && specific.includes(to))) return true;
    const wildcard = this.transitions['*'];
    if (wildcard === '*' || (Array.isArray(wildcard) && wildcard.includes(to))) return true;
    return false;
  }
}
