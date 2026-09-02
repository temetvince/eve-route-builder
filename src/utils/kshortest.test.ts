import { SearchFlag, dijkstra, pathCost } from './dijkstra';
import { Graph } from './graph';
import { kShortestPaths } from './kshortest';

type TestGraph = {
  graph: Graph;
  adjacency: Map<number, Set<number>>;
};

const FLAGS: SearchFlag[] = ['shortest', 'secure', 'insecure'];

const buildGraph = (edges: [number, number][], securities: Record<number, number>): TestGraph => {
  const graph = new Graph();
  const adjacency = new Map<number, Set<number>>();

  for (const key of Object.keys(securities)) {
    const system = parseInt(key);
    graph.addSystem(system, securities[system], []);
    adjacency.set(system, new Set());
  }

  for (const [a, b] of edges) {
    graph.addChain(a, b);
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  }

  return { graph, adjacency };
};

// Deterministic PRNG so failures reproduce.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomGraph = (rand: () => number, nodeCount: number): TestGraph => {
  const securities: Record<number, number> = {};
  for (let i = 0; i < nodeCount; i++) {
    securities[i] = rand() < 0.5 ? 0.9 : -0.4;
  }

  const edges: [number, number][] = [];
  // Spanning chain keeps the graph connected, then sprinkle extras.
  for (let i = 1; i < nodeCount; i++) {
    edges.push([i, Math.floor(rand() * i)]);
  }
  const extraEdges = Math.floor(rand() * nodeCount);
  for (let i = 0; i < extraEdges; i++) {
    const a = Math.floor(rand() * nodeCount);
    const b = Math.floor(rand() * nodeCount);
    if (a !== b) {
      edges.push([a, b]);
    }
  }

  return buildGraph(edges, securities);
};

// Every simple path start -> end, by DFS. Only viable on small graphs.
const allSimplePaths = (adjacency: Map<number, Set<number>>, start: number, end: number): number[][] => {
  const paths: number[][] = [];
  const visit = (current: number, path: number[], visited: Set<number>) => {
    if (current === end) {
      paths.push([...path]);
      return;
    }
    for (const next of adjacency.get(current)) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        visit(next, path, visited);
        path.pop();
        visited.delete(next);
      }
    }
  };
  visit(start, [start], new Set([start]));
  return paths;
};

const isValidPath = (adjacency: Map<number, Set<number>>, path: number[], start: number, end: number) => {
  if (path[0] !== start || path[path.length - 1] !== end) {
    return false;
  }
  if (new Set(path).size !== path.length) {
    return false;
  }
  for (let i = 1; i < path.length; i++) {
    if (!adjacency.get(path[i - 1]).has(path[i])) {
      return false;
    }
  }
  return true;
};

describe('kShortestPaths', () => {
  it('matches brute-force top-k costs on random graphs, all flags', () => {
    const rand = mulberry32(1337);

    for (let iteration = 0; iteration < 300; iteration++) {
      const nodeCount = 5 + Math.floor(rand() * 4);
      const { graph, adjacency } = randomGraph(rand, nodeCount);
      const start = 0;
      const end = nodeCount - 1;
      const k = 1 + Math.floor(rand() * 4);
      const flag = FLAGS[Math.floor(rand() * FLAGS.length)];

      const expected = allSimplePaths(adjacency, start, end)
        .map((path) => pathCost(graph, path, flag))
        .sort((a, b) => a - b)
        .slice(0, k);

      const actual = kShortestPaths(graph, start, end, flag, k);

      const context = `seed iter ${iteration}, flag ${flag}, k ${k}, nodes ${nodeCount}`;

      expect(actual.length).toBe(Math.min(k, expected.length));

      const keys = new Set(actual.map((p) => p.join(',')));
      expect(keys.size).toBe(actual.length);

      for (const path of actual) {
        expect(isValidPath(adjacency, path, start, end)).toBe(true);
      }

      const actualCosts = actual.map((p) => pathCost(graph, p, flag));
      for (let i = 1; i < actualCosts.length; i++) {
        expect(actualCosts[i]).toBeGreaterThanOrEqual(actualCosts[i - 1]);
      }

      expect({ context, costs: actualCosts }).toEqual({ context, costs: expected });
    }
  });

  it('returns the plain dijkstra route first', () => {
    const rand = mulberry32(42);
    const { graph } = randomGraph(rand, 8);

    const [first] = kShortestPaths(graph, 0, 7, 'secure', 3);
    expect(first).toEqual(dijkstra(graph, 0, 7, 'secure'));
  });

  it('returns fewer routes when the graph has fewer distinct paths', () => {
    // A straight line has exactly one loopless path.
    const { graph } = buildGraph(
      [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
      { 0: 0.9, 1: 0.9, 2: 0.9, 3: 0.9 },
    );

    expect(kShortestPaths(graph, 0, 3, 'shortest', 3)).toEqual([[0, 1, 2, 3]]);
  });

  it('returns [] when the destination is unreachable', () => {
    const { graph } = buildGraph([[0, 1]], { 0: 0.9, 1: 0.9, 2: 0.9 });
    expect(kShortestPaths(graph, 0, 2, 'shortest', 3)).toEqual([]);
  });

  it('ranks a wormhole chain shortcut first under secure, highsec detour second', () => {
    const HOME = 31000001;
    const C2 = 31000002;
    const HS_EXIT = 30000001;
    const DEST = 30000002;
    const HS_A = 30000003;
    const HS_B = 30000004;
    const HS_C = 30000005;

    const securities: Record<number, number> = {
      [HOME]: -0.99,
      [C2]: -0.99,
      [HS_EXIT]: 0.9,
      [DEST]: 0.9,
      [HS_A]: 0.9,
      [HS_B]: 0.9,
      [HS_C]: 0.9,
    };

    const { graph } = buildGraph(
      [
        [HOME, C2], // chain hop
        [C2, HS_EXIT], // chain exit
        [HS_EXIT, DEST],
        [HOME, HS_A], // long detour entrance
        [HS_A, HS_B],
        [HS_B, HS_C],
        [HS_C, DEST],
      ],
      securities,
    );

    const routes = kShortestPaths(graph, HOME, DEST, 'secure', 2);

    expect(routes[0]).toEqual([HOME, C2, HS_EXIT, DEST]);
    expect(routes[1]).toEqual([HOME, HS_A, HS_B, HS_C, DEST]);
  });
});
