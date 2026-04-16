import { StateMachine } from '@/util/state-machine';

type Light = 'red' | 'yellow' | 'green';

describe('StateMachine basics', () => {
  it('starts in initial state', () => {
    const sm = new StateMachine<Light>('red');
    expect(sm.state).toBe('red');
    expect(sm.previous).toBeUndefined();
  });

  it('transitions and tracks previous', () => {
    const sm = new StateMachine<Light>('red');
    sm.setState('green');
    expect(sm.state).toBe('green');
    expect(sm.previous).toBe('red');
  });

  it('tracks multiple transitions', () => {
    const sm = new StateMachine<Light>('red');
    sm.setState('green');
    sm.setState('yellow');
    expect(sm.state).toBe('yellow');
    expect(sm.previous).toBe('green');
  });

  it('is() checks current state', () => {
    const sm = new StateMachine<Light>('red');
    expect(sm.is('red')).toBe(true);
    expect(sm.is('green')).toBe(false);
  });

  it('was() checks previous state', () => {
    const sm = new StateMachine<Light>('red');
    expect(sm.was(undefined)).toBe(true);
    sm.setState('green');
    expect(sm.was('red')).toBe(true);
    expect(sm.was('green')).toBe(false);
  });

  it('no-ops when setting same state', () => {
    const sm = new StateMachine<Light>('red');
    const calls: string[] = [];
    sm.onStateChange(() => calls.push('changed'));
    sm.setState('red');
    expect(calls).toEqual([]);
    expect(sm.previous).toBeUndefined();
  });
});

describe('change handlers', () => {
  it('fires with prev and current', () => {
    const sm = new StateMachine<Light>('red');
    const calls: [Light | undefined, Light][] = [];
    sm.onStateChange((prev, cur) => calls.push([prev, cur]));
    sm.setState('green');
    sm.setState('yellow');
    expect(calls).toEqual([
      ['red', 'green'],
      ['green', 'yellow'],
    ]);
  });

  it('fires multiple handlers in registration order', () => {
    const sm = new StateMachine<Light>('red');
    const order: number[] = [];
    sm.onStateChange(() => order.push(1));
    sm.onStateChange(() => order.push(2));
    sm.setState('green');
    expect(order).toEqual([1, 2]);
  });

  it('does not fire on no-op', () => {
    const sm = new StateMachine<Light>('red');
    let called = false;
    sm.onStateChange(() => (called = true));
    sm.setState('red');
    expect(called).toBe(false);
  });
});

describe('exits validation', () => {
  it('allows valid exits', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: ['yellow'], yellow: ['red'] },
    });
    sm.setState('green');
    sm.setState('yellow');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('throws on invalid exit', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: ['yellow'], yellow: ['red'] },
    });
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: red → yellow');
  });

  it('throws when state has empty exit list', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: [] },
    });
    sm.setState('green');
    expect(() => sm.setState('red')).toThrow('Invalid transition: green → red');
  });

  it('throws when state not in exits map', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'] },
    });
    sm.setState('green');
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: green → yellow');
  });

  it('wildcard exits allows any target', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: '*' },
    });
    sm.setState('green');
    expect(sm.state).toBe('green');
  });
});

describe('entries validation', () => {
  it('allows valid entries', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'] },
      entries: { red: '*' },
    });
    sm.setState('green');
    // green has no exits, but red has entries from anywhere
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('entries with specific sources', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: ['yellow'] },
      entries: { red: ['yellow'] },
    });
    sm.setState('green');
    sm.setState('yellow');
    // yellow has no exits, but red accepts entry from yellow
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('rejects entry from unlisted source', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: ['yellow'] },
      entries: { red: ['yellow'] },
    });
    sm.setState('green');
    // green is not in red's entries list
    expect(() => sm.setState('red')).toThrow('Invalid transition: green → red');
  });

  it('wildcard entries allows any source', () => {
    const sm = new StateMachine<Light>('red', {
      entries: { green: '*' },
    });
    sm.setState('green');
    expect(sm.state).toBe('green');
  });
});

describe('no config', () => {
  it('allows any transition', () => {
    const sm = new StateMachine<Light>('red');
    sm.setState('yellow');
    sm.setState('green');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });
});

describe('exits + entries combined', () => {
  it('passes if either side allows', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'], green: ['yellow'] },
      entries: { red: '*' },
    });
    sm.setState('green');
    sm.setState('yellow');
    // yellow has no exits to red, but red has entries from '*'
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('rejects when neither side allows', () => {
    const sm = new StateMachine<Light>('red', {
      exits: { red: ['green'] },
      entries: { yellow: ['green'] },
    });
    // red can't exit to yellow, and yellow only accepts entry from green
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: red → yellow');
  });
});
