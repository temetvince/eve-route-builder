# Fork changelog

Differences between [temetvince/eve-route-builder](https://github.com/temetvince/eve-route-builder)
(branch `custom`) and upstream
[wanderer-industries/eve-route-builder](https://github.com/wanderer-industries/eve-route-builder). Only fork
changes are recorded here. Newest first.

## 2026-09-02

### Changed

- The `shortest` flag breaks jump-count ties toward safety: a 6-jump all-highsec route beats a 6-jump route
  through lowsec (epsilon surcharge of 1/1024 per unsafe system, never enough to change the jump-count
  ordering itself).

### Added

- `AGENTS.md` working agreement, `.markdownlint.json`, and this changelog.

## 2026-08-27

### Fixed

- The `secure` flag treats J-space systems as safe: wormhole systems have no stargates, so any J-system on a
  route can only come from a mapped connection the user chose to include. Upstream priced them like
  lowsec/null, making "safest" routes take arbitrarily long all-highsec detours instead of one extra chain
  hop. Lowsec/nullsec k-space, Pochven and Zarzakh keep the full penalty.
- The Docker build uses the committed `src/assets/graph.json` instead of regenerating it: the Fuzzwork CSV
  URLs return 404 and `generateGraph` silently overwrote the graph with garbage parsed from the error page,
  crashing the service at startup on every fresh image build.

### Changed

- Rewrote the Dijkstra search core with proper relaxation (upstream's decrease-key branch was dead code and
  stayed optimal only by accident of the node-only weight model) and falsy-id-safe path reconstruction.

### Added

- Test suites: a reference-comparison suite (~10k randomized graphs across all flags, mapped chains and
  multi-destination included), a heap sanity check, a safety tie-break scenario, and a regression test for
  the C1 → C2 → highsec routing scenario.
