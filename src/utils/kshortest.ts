import { Banned, SearchFlag, dijkstra, edgeKey, pathCost } from './dijkstra';
import { Graph } from './graph';

const samePrefix = (path: number[], rootPath: number[]): boolean => {
  if (path.length < rootPath.length) {
    return false;
  }

  for (let i = 0; i < rootPath.length; i++) {
    if (path[i] !== rootPath[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Yen's k-shortest loopless paths on top of the flag's cost model, ranked by
 * total cost, ties broken by fewer jumps. Returns fewer than k paths when the
 * graph has fewer distinct loopless routes. The first entry is always the
 * plain dijkstra result.
 */
export const kShortestPaths = (
  graph: Graph,
  start: number,
  end: number,
  flag: SearchFlag,
  k: number,
): number[][] => {
  const first = dijkstra(graph, start, end, flag);
  if (first.length === 0) {
    return [];
  }

  const found: number[][] = [first];
  const candidates: { path: number[]; cost: number }[] = [];
  const seen = new Set<string>([first.join(',')]);

  while (found.length < k) {
    const prevPath = found[found.length - 1];

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      // Force the spur path to diverge: ban the next edge of every found path
      // sharing this root, and ban the root's interior nodes so the total
      // path stays loopless.
      const banned: Banned = {
        edges: new Set<string>(),
        nodes: new Set<number>(rootPath.slice(0, -1)),
      };

      for (const path of found) {
        if (samePrefix(path, rootPath) && path.length > i + 1) {
          banned.edges.add(edgeKey(path[i], path[i + 1]));
        }
      }

      const spurPath = dijkstra(graph, spurNode, end, flag, banned);
      if (spurPath.length === 0) {
        continue;
      }

      const total = [...rootPath.slice(0, -1), ...spurPath];
      const key = total.join(',');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      candidates.push({ path: total, cost: pathCost(graph, total, flag) });
    }

    if (candidates.length === 0) {
      break;
    }

    candidates.sort((a, b) => a.cost - b.cost || a.path.length - b.path.length);
    found.push(candidates.shift().path);
  }

  return found;
};
