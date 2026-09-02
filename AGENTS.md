# AGENTS.md — working agreement for this fork

Standing instructions for any AI assistant working in this repository. This fork follows the same working
agreement as its companion, [temetvince/wanderer](https://github.com/temetvince/wanderer) — read the
`AGENTS.md` there (also at `../wanderer/AGENTS.md` on the dev machine) for the full rules: no AI attribution
anywhere, verify before pushing, ask on trade-offs, docs ship with the change, markdown passes
`.markdownlint.json`.

Facts specific to this repository:

- `main` mirrors upstream [wanderer-industries/eve-route-builder](https://github.com/wanderer-industries/eve-route-builder);
  all changes live on `custom`. Remotes: `origin` → fork, `upstream` → wanderer-industries.
- What the fork changes is documented in the README's "About this fork" section.
- The committed `src/assets/graph.json` is the source of truth for the universe graph. The Dockerfile must
  **never** regenerate it during builds: the Fuzzwork CSV URLs return 404, and `generateGraph` would silently
  overwrite the graph with garbage parsed from the error page, crashing the service at startup.
- Build: `docker build -t eve-route-builder-custom:latest .` — then **smoke-test it** (run the container and
  POST a route to `/route/multiple`); a clean build proves nothing about runtime.
- Tests: the fork's suites (`npx jest src/utils/dijkstra src/utils/kshortest src/utils/heap`) must be green.
  Two upstream suites fail on pristine checkouts too — `src/utils/graph.test.ts` (stale snapshots) and the
  controller spec; they are not yours to fix and not a regression signal.
- Deployment happens from the wanderer fork's `deploy/update.sh`; this repo has no deploy assets of its own.
