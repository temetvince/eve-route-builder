import { dijkstra, dijkstraMulti, SearchFlag } from './dijkstra';
import { Graph } from './graph';

// Reference implementation: textbook Dijkstra with full relaxation
// (O(V^2) array scan), over the same node-entry weights the service uses.
const weight = (security: number, flag: SearchFlag) => {
  if (flag === 'secure') return security < 0.45 ? 50000 : 1;
  if (flag === 'insecure') return security >= 0.45 ? 50000 : 1;
  // shortest: unsafe systems carry the safety tie-break surcharge.
  return security < 0.45 ? 1 + 1 / 1024 : 1;
};

type TestGraph = { securities: number[]; adj: number[][] };

const referenceCost = (g: TestGraph, start: number, end: number, flag: SearchFlag): number | null => {
  const n = g.securities.length;
  const dist = new Array(n).fill(Infinity);
  const done = new Array(n).fill(false);
  dist[start] = 0;

  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    done[u] = true;
    if (u === end) return dist[u];

    for (const v of g.adj[u]) {
      const nd = dist[u] + weight(g.securities[v], flag);
      if (nd < dist[v]) dist[v] = nd;
    }
  }

  return dist[end] === Infinity ? null : dist[end];
};

const pathCost = (g: TestGraph, path: number[], flag: SearchFlag): number => {
  // Cost counts entered systems (all but the first), same as the service.
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    cost += weight(g.securities[path[i]], flag);
  }
  return cost;
};

// Deterministic PRNG so failures are reproducible.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomGraph = (rand: () => number, n: number, extraEdges: number): TestGraph => {
  const securities = Array.from({ length: n }, () => (rand() < 0.4 ? -0.5 + rand() : 0.45 + rand() * 0.55));
  const adj: number[][] = Array.from({ length: n }, () => []);

  const addEdge = (a: number, b: number) => {
    if (a !== b && !adj[a].includes(b)) {
      adj[a].push(b);
      adj[b].push(a);
    }
  };

  // Random spanning tree keeps it connected, then extra edges add alternatives.
  for (let i = 1; i < n; i++) {
    addEdge(i, Math.floor(rand() * i));
  }
  for (let i = 0; i < extraEdges; i++) {
    addEdge(Math.floor(rand() * n), Math.floor(rand() * n));
  }

  return { securities, adj };
};

// Offset ids like real EVE system ids (never 0/falsy).
const ID_OFFSET = 30000000;

const toServiceGraph = (g: TestGraph): Graph => {
  const graph = new Graph();
  g.securities.forEach((security, i) =>
    graph.addSystem(
      i + ID_OFFSET,
      security,
      g.adj[i].map((x) => x + ID_OFFSET),
    ),
  );
  return graph;
};

describe('dijkstra optimality against reference implementation', () => {
  const flags: SearchFlag[] = ['secure', 'insecure', 'shortest'];

  it.each(flags)('matches reference cost on random graphs (%s)', (flag) => {
    const rand = mulberry32(0xc0ffee + flag.length);

    for (let iter = 0; iter < 2000; iter++) {
      const n = 8 + Math.floor(rand() * 120);
      const g = randomGraph(rand, n, Math.floor(rand() * n * 2));
      const start = Math.floor(rand() * n);
      const end = Math.floor(rand() * n);
      if (start === end) continue;

      const expected = referenceCost(g, start, end, flag);
      const path = dijkstra(toServiceGraph(g), start + ID_OFFSET, end + ID_OFFSET, flag).map(
        (x) => Number(x) - ID_OFFSET,
      );

      if (expected === null) {
        expect(path).toEqual([]);
        continue;
      }

      expect(path[0]).toBe(start);
      expect(path[path.length - 1]).toBe(end);
      // Every hop must be a real edge.
      for (let i = 1; i < path.length; i++) {
        expect(g.adj[path[i - 1]]).toContain(path[i]);
      }

      const actual = pathCost(g, path, flag);
      if (actual !== expected) {
        throw new Error(
          `Suboptimal ${flag} route on iter ${iter}: cost ${actual} vs optimal ${expected}\n` +
            `n=${n} start=${start} end=${end}\npath=${JSON.stringify(path)}\n` +
            `securities=${JSON.stringify(g.securities)}\nadj=${JSON.stringify(g.adj)}`,
        );
      }
    }
  });

  it.each(flags)('matches reference with additional wormhole chains (%s)', (flag) => {
    const rand = mulberry32(0xbeef + flag.length);

    for (let iter = 0; iter < 1000; iter++) {
      const n = 8 + Math.floor(rand() * 60);
      const g = randomGraph(rand, n, Math.floor(rand() * n));
      const start = Math.floor(rand() * n);
      const end = Math.floor(rand() * n);
      if (start === end) continue;

      // Simulate mapped wormhole connections: extra edges added on top of the
      // static graph via addAdditionalChain, exactly as the service does.
      const chains: [number, number][] = [];
      const chainCount = 1 + Math.floor(rand() * 6);
      for (let i = 0; i < chainCount; i++) {
        const a = Math.floor(rand() * n);
        const b = Math.floor(rand() * n);
        if (a !== b) chains.push([a, b]);
      }

      const refGraph: TestGraph = { securities: g.securities, adj: g.adj.map((x) => [...x]) };
      for (const [a, b] of chains) {
        if (!refGraph.adj[a].includes(b)) refGraph.adj[a].push(b);
        if (!refGraph.adj[b].includes(a)) refGraph.adj[b].push(a);
      }

      const serviceGraph = toServiceGraph(g);
      for (const [a, b] of chains) {
        serviceGraph.addAdditionalChain(a + ID_OFFSET, b + ID_OFFSET);
      }

      const expected = referenceCost(refGraph, start, end, flag);
      const path = dijkstra(serviceGraph, start + ID_OFFSET, end + ID_OFFSET, flag).map(
        (x) => Number(x) - ID_OFFSET,
      );

      if (expected === null) {
        expect(path).toEqual([]);
        continue;
      }

      expect(path[0]).toBe(start);
      expect(path[path.length - 1]).toBe(end);
      expect(pathCost(refGraph, path, flag)).toBe(expected);
    }
  });

  it.each(flags)('dijkstraMulti matches reference cost per destination (%s)', (flag) => {
    const rand = mulberry32(0xabcd + flag.length);

    for (let iter = 0; iter < 500; iter++) {
      const n = 8 + Math.floor(rand() * 60);
      const g = randomGraph(rand, n, Math.floor(rand() * n * 2));
      const start = Math.floor(rand() * n);
      const ends = Array.from(
        new Set(Array.from({ length: 1 + Math.floor(rand() * 5) }, () => Math.floor(rand() * n))),
      ).filter((x) => x !== start);
      if (ends.length === 0) continue;

      const results = dijkstraMulti(
        toServiceGraph(g),
        start + ID_OFFSET,
        ends.map((x) => x + ID_OFFSET),
        flag,
      );

      for (const end of ends) {
        const expected = referenceCost(g, start, end, flag);
        const result = results.find((r) => Number(r.destination) - ID_OFFSET === end);
        const path = (result?.systems ?? []).map((x) => Number(x) - ID_OFFSET);

        if (expected === null) {
          expect(path).toEqual([]);
          continue;
        }

        expect(path.length).toBeGreaterThan(0);
        expect(pathCost(g, path, flag)).toBe(expected);
      }
    }
  });
});
