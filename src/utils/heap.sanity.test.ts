import { Fibonacci_heap } from './fibonacci_heap';

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Fibonacci_heap sanity', () => {
  it('dequeues in non-decreasing priority order', () => {
    const rand = mulberry32(42);

    for (let iter = 0; iter < 50; iter++) {
      const heap = new Fibonacci_heap();
      const values: number[] = [];
      const count = 5 + Math.floor(rand() * 50);

      for (let i = 0; i < count; i++) {
        const p = Math.floor(rand() * 100);
        values.push(p);
        heap.enqueue(p, p);
      }

      const out: number[] = [];
      while (heap.isValid()) {
        out.push(heap.dequeue_min().get_value() as number);
      }

      expect(out).toEqual([...values].sort((a, b) => a - b));
    }
  });

  it('interleaves enqueue and dequeue correctly', () => {
    const rand = mulberry32(1337);

    for (let iter = 0; iter < 50; iter++) {
      const heap = new Fibonacci_heap();
      const reference: number[] = [];
      const out: number[] = [];
      const expected: number[] = [];

      for (let op = 0; op < 200; op++) {
        if (reference.length === 0 || rand() < 0.6) {
          const p = Math.floor(rand() * 1000);
          reference.push(p);
          heap.enqueue(p, p);
        } else {
          reference.sort((a, b) => a - b);
          expected.push(reference.shift()!);
          out.push(heap.dequeue_min().get_value() as number);
        }
      }

      expect(out).toEqual(expected);
    }
  });
});
