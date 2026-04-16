"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
class StateMachine {
    constructor(initialState, rules) {
        this.changeHandlers = [];
        this._state = initialState;
        this.rules = rules;
    }
    get state() {
        return this._state;
    }
    get previous() {
        return this._previous;
    }
    setState(next) {
        if (next === this._state)
            return;
        if (!this.isAllowed(this._state, next)) {
            throw new Error(`Invalid transition: ${this._state} → ${next}`);
        }
        this._previous = this._state;
        this._state = next;
        for (const h of this.changeHandlers)
            h(this._previous, this._state);
    }
    is(state) {
        return this._state === state;
    }
    was(state) {
        return this._previous === state;
    }
    onStateChange(handler) {
        this.changeHandlers.push(handler);
    }
    isAllowed(from, to) {
        if (!this.rules)
            return true;
        // Check exits: can `from` go to `to`?
        const exits = this.rules.exits?.[from];
        if (exits === '*' || (Array.isArray(exits) && exits.includes(to)))
            return true;
        // Check entries: can `to` be reached from `from`?
        const entries = this.rules.entries?.[to];
        if (entries === '*' || (Array.isArray(entries) && entries.includes(from)))
            return true;
        return false;
    }
}
exports.StateMachine = StateMachine;
//# sourceMappingURL=state-machine.js.map