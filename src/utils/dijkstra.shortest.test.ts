import { dijkstra } from './dijkstra';
import { Graph } from './graph';

// The `shortest` flag ranks by jump count first, but between routes with the
// same number of jumps the safer one must win.
describe('shortest flag safety tie-break', () => {
  const HOME = 30000001;
  const DEST = 30000008;
  const SAFE_A = 30000002;
  const SAFE_B = 30000003;
  const SAFE_C = 30000004;
  const LOW_A = 30000005;
  const SAFE_D = 30000006;
  const SAFE_E = 30000007;

  const build = () => {
    const graph = new Graph();
    graph.addSystem(HOME, 0.9, []);
    graph.addSystem(DEST, 0.9, []);
    graph.addSystem(SAFE_A, 0.9, []);
    graph.addSystem(SAFE_B, 0.8, []);
    graph.addSystem(SAFE_C, 0.7, []);
    graph.addSystem(LOW_A, 0.3, []);
    graph.addSystem(SAFE_D, 0.9, []);
    graph.addSystem(SAFE_E, 0.9, []);

    // Two 4-jump routes: one all-highsec, one through lowsec.
    graph.addChain(HOME, SAFE_A);
    graph.addChain(SAFE_A, SAFE_B);
    graph.addChain(SAFE_B, SAFE_C);
    graph.addChain(SAFE_C, DEST);

    graph.addChain(HOME, LOW_A);
    graph.addChain(LOW_A, SAFE_D);
    graph.addChain(SAFE_D, SAFE_E);
    graph.addChain(SAFE_E, DEST);

    return graph;
  };

  it('picks the all-safe route when jump counts tie', () => {
    const path = dijkstra(build(), HOME, DEST, 'shortest');
    expect(path).toEqual([HOME, SAFE_A, SAFE_B, SAFE_C, DEST]);
  });

  it('still takes a strictly shorter route even through lowsec', () => {
    const graph = build();
    // Lowsec shortcut: HOME -> LOW_A -> DEST is 2 jumps vs 4 safe jumps.
    graph.addChain(LOW_A, DEST);

    const path = dijkstra(graph, HOME, DEST, 'shortest');
    expect(path).toEqual([HOME, LOW_A, DEST]);
  });
});
