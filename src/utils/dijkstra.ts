import { Fibonacci_heap } from './fibonacci_heap';
import { Graph } from './graph';
import { StopCondition } from '../types';

const prefer_shortest = () => {
  return 1;
};

// J-space (31000000-31999999, including Thera and drifter holes). Wormhole
// systems have no stargates, so any J-system on a route is reachable only
// through a mapped (or Thera) connection the user chose to include. Treating
// them as unsafe would make "safest" avoid an extra chain hop at any cost -
// e.g. take a long all-highsec detour instead of jumping through a connected
// C2 with a closer highsec exit. The unsafe penalty is for lowsec/nullsec
// k-space (and Pochven/Zarzakh, whose ids are in the k-space range).
const isWormholeSpace = (system: number) => {
  return system >= 31000000 && system < 32000000;
};

const prefer_safest = (graph: Graph, next_sys: number) => {
  if (isWormholeSpace(next_sys)) {
    return 1;
  }

  if (graph.security(next_sys) < 0.45) {
    return 50000;
  }

  return 1;
};

const prefer_less_safe = (graph: Graph, next_sys: number) => {
  if (graph.security(next_sys) >= 0.45) {
    return 50000;
  }

  return 1;
};

const COST_FN = {
  secure: prefer_safest,
  insecure: prefer_less_safe,
  shortest: prefer_shortest,
};

export type SearchFlag = 'secure' | 'insecure' | 'shortest';

/**
 * Dijkstra over the system graph with the flag's per-system entry cost.
 *
 * With the `secure` flag every unsafe system costs 50000 and every safe one
 * costs 1, so minimizing total cost minimizes the number of unsafe systems
 * first and the total number of jumps second - the shortest safe route.
 * (`insecure` is the mirror image; `shortest` weighs every system equally.)
 *
 * Uses lazy re-insertion instead of decrease-key: relaxing a node enqueues it
 * again at the lower cost, and stale queue entries are skipped when dequeued.
 * State lives in Maps/Sets so system ids and costs are never subject to
 * falsy-value pitfalls.
 */
const search = (graph: Graph, start: number, targets: number[], flag: SearchFlag, shouldStop?: StopCondition) => {
  const weightFn = COST_FN[flag];
  const prev = new Map<number, number>();
  const costs = new Map<number, number>([[start, 0]]);
  const settled = new Set<number>();
  const remaining = new Set<number>(targets);
  const foundTargets = new Set<number>();

  const queue = new Fibonacci_heap();
  queue.enqueue(start, 0);

  while (queue.isValid()) {
    const system = queue.dequeue_min().get_value() as number;

    if (settled.has(system)) {
      continue;
    }
    settled.add(system);

    if (remaining.has(system)) {
      remaining.delete(system);
      foundTargets.add(system);

      if (remaining.size === 0) {
        break;
      }

      if (shouldStop?.({ ends: targets, foundTargets, current: system })) {
        break;
      }
    }

    const baseCost = costs.get(system);

    for (const neighbor of graph.neighbors(system)) {
      if (settled.has(neighbor)) {
        continue;
      }

      const newCost = baseCost + weightFn(graph, neighbor);
      const knownCost = costs.get(neighbor);

      if (knownCost === undefined || newCost < knownCost) {
        costs.set(neighbor, newCost);
        prev.set(neighbor, system);
        queue.enqueue(neighbor, newCost);
      }
    }
  }

  return { prev, foundTargets };
};

const buildPath = (prev: Map<number, number>, start: number, end: number): number[] => {
  if (start === end) {
    return [start];
  }

  const out: number[] = [];
  let system = end;

  while (system !== start) {
    out.unshift(system);

    const parent = prev.get(system);
    if (parent === undefined) {
      return [];
    }
    system = parent;
  }

  out.unshift(start);
  return out;
};

export const dijkstra = (graph: Graph, start: number, end: number, flag: SearchFlag = 'shortest'): number[] => {
  const { prev } = search(graph, start, [end], flag);
  return buildPath(prev, start, end);
};

export const dijkstraMulti = (
  graph: Graph,
  start: number,
  ends: number[],
  flag: SearchFlag = 'secure',
  shouldStop?: StopCondition,
) => {
  const { prev, foundTargets } = search(graph, start, ends, flag, shouldStop);

  return [...foundTargets]
    .map((dest) => ({
      origin: start.toString(),
      destination: dest.toString(),
      systems: buildPath(prev, start, dest),
      success: true,
    }))
    .sort((a, b) => a.systems.length - b.systems.length);
};
