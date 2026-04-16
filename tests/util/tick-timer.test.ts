import { TickTimer } from '@/util/tick-timer';

describe('TickTimer', () => {
  it('flushes after interval ticks', () => {
    const onFlush = jest.fn();
    const timer = new TickTimer(3, onFlush);

    timer.tick(0); // first — no previous, skipped
    timer.tick(100); // delta 100
    timer.tick(200); // delta 100
    timer.tick(350); // delta 150 — 3rd, triggers flush

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({
      ticks: 3,
      avgMs: 117,
      minMs: 100,
      maxMs: 150,
    });
  });

  it('skips first tick', () => {
    const onFlush = jest.fn();
    const timer = new TickTimer(1, onFlush);

    timer.tick(0);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('resets accumulators after flush but preserves lastTick', () => {
    const onFlush = jest.fn();
    const timer = new TickTimer(2, onFlush);

    timer.tick(0);
    timer.tick(100); // delta 100
    timer.tick(200); // delta 100, flush

    timer.tick(500); // delta 300
    timer.tick(600); // delta 100, flush

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenLastCalledWith({
      ticks: 2,
      avgMs: 200,
      minMs: 100,
      maxMs: 300,
    });
  });

  it('does not flush when interval is 0', () => {
    const onFlush = jest.fn();
    const timer = new TickTimer(0, onFlush);

    for (let i = 0; i < 1000; i++) timer.tick(i * 10);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('reset discards accumulated data and skips next delta', () => {
    const onFlush = jest.fn();
    const timer = new TickTimer(2, onFlush);

    timer.tick(0);
    timer.tick(100);
    timer.reset();

    // Next tick after reset is treated as first — no delta
    timer.tick(5000);
    timer.tick(5100); // delta 100
    timer.tick(5200); // delta 100, flush

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({
      ticks: 2,
      avgMs: 100,
      minMs: 100,
      maxMs: 100,
    });
  });
});
