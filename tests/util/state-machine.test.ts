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

describe('transition validation', () => {
  it('allows valid transitions', () => {
    const sm = new StateMachine<Light>('red', {
      red: ['green'],
      green: ['yellow'],
      yellow: ['red'],
    });
    sm.setState('green');
    sm.setState('yellow');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('throws on invalid transition', () => {
    const sm = new StateMachine<Light>('red', {
      red: ['green'],
      green: ['yellow'],
      yellow: ['red'],
    });
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: red → yellow');
  });

  it('throws when state has empty target list', () => {
    const sm = new StateMachine<Light>('red', {
      red: ['green'],
      green: [],
    });
    sm.setState('green');
    expect(() => sm.setState('red')).toThrow('Invalid transition: green → red');
  });

  it('throws when state is not in map', () => {
    const sm = new StateMachine<Light>('red', {
      red: ['green'],
    });
    sm.setState('green');
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: green → yellow');
  });

  it('allows any transition without map', () => {
    const sm = new StateMachine<Light>('red');
    sm.setState('yellow');
    sm.setState('green');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });
});

describe('wildcard transitions', () => {
  it('* value: state can go to any target', () => {
    const sm = new StateMachine<Light>('red', {
      red: '*',
      green: ['yellow'],
      yellow: ['red'],
    });
    sm.setState('green');
    expect(sm.state).toBe('green');
    // Reset to test other target
    const sm2 = new StateMachine<Light>('red', { red: '*' });
    sm2.setState('yellow');
    expect(sm2.state).toBe('yellow');
  });

  it('* key: any state can go to listed targets', () => {
    const sm = new StateMachine<Light>('red', {
      '*': ['red'],
      red: ['green'],
    });
    sm.setState('green');
    // green has no explicit targets, but wildcard allows red
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('* key rejects unlisted targets', () => {
    const sm = new StateMachine<Light>('red', {
      '*': ['red'],
      red: ['green'],
    });
    sm.setState('green');
    expect(() => sm.setState('yellow')).toThrow('Invalid transition: green → yellow');
  });

  it('* key with * value: any transition allowed', () => {
    const sm = new StateMachine<Light>('red', { '*': '*' });
    sm.setState('yellow');
    sm.setState('green');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });

  it('specific rule takes priority alongside wildcard', () => {
    const sm = new StateMachine<Light>('red', {
      '*': ['red'],
      red: ['green'],
      green: ['yellow'],
    });
    // red → green (specific), green → yellow (specific), yellow → red (wildcard)
    sm.setState('green');
    sm.setState('yellow');
    sm.setState('red');
    expect(sm.state).toBe('red');
  });
});
