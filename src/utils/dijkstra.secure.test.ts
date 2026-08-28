import { dijkstra } from './dijkstra';
import { Graph } from './graph';

// Regression for the reported scenario: a C1 connects to highsec and to a C2,
// and the C2 also connects to highsec, closer to the destination. With the
// "secure" flag (Show shortest unchecked) the route must take the shorter
// all-highsec path through the C2 chain instead of avoiding the extra
// wormhole hop by taking a long highsec detour.
describe('secure routing through mapped wormhole chains', () => {
  const C1 = 31000001;
  const C2 = 31000002;
  const HS_EXIT_A = 30000001; // C1's highsec exit, far from destination
  const HS_EXIT_B = 30000010; // C2's highsec exit, next to destination
  const DEST = 30000099;
  const LOW = 30000050;

  const longHighsecChain = [30000002, 30000003, 30000004, 30000005, 30000006];

  const buildGraph = ({ lowsecShortcut = false } = {}) => {
    const graph = new Graph();

    graph.addSystem(C1, -0.9);
    graph.addSystem(C2, -0.9);
    graph.addSystem(HS_EXIT_A, 0.9);
    graph.addSystem(HS_EXIT_B, 0.9);
    graph.addSystem(DEST, 0.9);
    graph.addSystem(LOW, 0.2);
    longHighsecChain.forEach((id) => graph.addSystem(id, 0.9));

    // Long all-highsec gate route: HS_EXIT_A -> ...chain... -> DEST
    graph.addChain(HS_EXIT_A, longHighsecChain[0]);
    for (let i = 1; i < longHighsecChain.length; i++) {
      graph.addChain(longHighsecChain[i - 1], longHighsecChain[i]);
    }
    graph.addChain(longHighsecChain[longHighsecChain.length - 1], DEST);

    if (lowsecShortcut) {
      // A lowsec system sits between C2's exit and the destination.
      graph.addChain(HS_EXIT_B, LOW);
      graph.addChain(LOW, DEST);
    } else {
      // Short all-highsec hop from C2's exit.
      graph.addChain(HS_EXIT_B, DEST);
    }

    // Mapped wormhole connections.
    graph.addAdditionalChain(C1, HS_EXIT_A);
    graph.addAdditionalChain(C1, C2);
    graph.addAdditionalChain(C2, HS_EXIT_B);

    return graph;
  };

  it('takes the shorter safe route through the connected C2', () => {
    const route = dijkstra(buildGraph(), C1, DEST, 'secure');
    expect(route).toEqual([C1, C2, HS_EXIT_B, DEST]);
  });

  it('still avoids lowsec k-space when the wormhole shortcut leads through it', () => {
    const route = dijkstra(buildGraph({ lowsecShortcut: true }), C1, DEST, 'secure');
    expect(route).toEqual([C1, HS_EXIT_A, ...longHighsecChain, DEST]);
  });

  it('shortest flag prefers the wormhole shortcut even through lowsec', () => {
    const route = dijkstra(buildGraph({ lowsecShortcut: true }), C1, DEST, 'shortest');
    expect(route).toEqual([C1, C2, HS_EXIT_B, LOW, DEST]);
  });
});
