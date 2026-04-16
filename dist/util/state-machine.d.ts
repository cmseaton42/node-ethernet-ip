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
export interface TransitionRules<T extends string> {
    exits?: Partial<Record<T, T[] | '*'>>;
    entries?: Partial<Record<T, T[] | '*'>>;
}
export declare class StateMachine<T extends string & (string extends T ? never : unknown)> {
    private _state;
    private _previous?;
    private readonly rules?;
    private readonly changeHandlers;
    constructor(initialState: T, rules?: TransitionRules<T>);
    get state(): T;
    get previous(): T | undefined;
    setState(next: T): void;
    is(state: T): boolean;
    was(state: T | undefined): boolean;
    onStateChange(handler: (prev: T | undefined, current: T) => void): void;
    private isAllowed;
}
//# sourceMappingURL=state-machine.d.ts.map