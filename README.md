# eve-route-builder

## About this fork

This is [temetvince/eve-route-builder](https://github.com/temetvince/eve-route-builder),
a fork of [wanderer-industries/eve-route-builder](https://github.com/wanderer-industries/eve-route-builder).
`main` is a pristine mirror of upstream; all changes live on the `custom` branch:

- **`secure` routing treats J-space as safe.** Upstream priced entering any
  system with security < 0.45 at 50000 — including wormhole systems in the
  user's own mapped chain — so "safest" routes took arbitrarily long
  all-highsec detours rather than one extra chain hop (e.g. a C1 → C2 →
  highsec exit next to the destination). J-space systems have no stargates, so
  any J-system on a route can only come from a connection the user chose to
  include; they now weigh the same as safe systems, while lowsec/nullsec
  k-space, Pochven and Zarzakh keep the full penalty.
- **Rewritten Dijkstra core** with proper relaxation (the old version's
  decrease-key branch was dead code and stayed optimal only by accident of the
  node-only weight model) and falsy-id-safe path reconstruction, shared by
  `dijkstra` and `dijkstraMulti`.
- **Test suites**: a reference-comparison suite (~10k randomized graphs across
  all flags, mapped chains and multi-destination included), a heap sanity
  check, and a regression test for the C1 → C2 scenario above.

Two upstream test suites fail on a pristine checkout as well (stale `Graph`
snapshots and controller spec drift) — they are unrelated to these changes.

Used together with [temetvince/wanderer](https://github.com/temetvince/wanderer).

### Keeping up with upstream

```bash
git fetch upstream
git checkout custom
git rebase upstream/main
git push --force-with-lease origin custom
```

Remotes: `origin` → this fork, `upstream` → wanderer-industries.

### Build and deploy

```bash
docker build -t eve-route-builder-custom:latest .
```

Reference `eve-route-builder-custom:latest` as the route-builder image in the
community-edition `docker-compose.yml`.

### Run the tests

```bash
npx jest src/utils          # this fork's suites (all passing)
npx jest                    # everything, including the two pre-existing upstream failures
```

## Description

This is a tool for search route path for [EVE-ONLINE](https://www.eveonline.com/) game.

## How it works?

It does not use EVE-ONLINE [API](https://esi.evetech.net/ui/#/Routes/get_route_origin_destination)
it works same. It based and copied
[the esi-routes dijkstra](https://github.com/esi/esi-routes/blob/master/esi_routes/dijkstra.py) algorithm.
Also, you are able to find the original source code in
[the esi-routes repository](https://github.com/esi/esi-routes).

## Getting started

### Install dependencies

```bash
npm install
```

### Downloads

Download the latest solar system tables from
[the Fuzzwork latest dump](https://www.fuzzwork.co.uk/dump/latest/). They should be in .csv format.

Link for download [mapSolarSystems.csv](https://www.fuzzwork.co.uk/dump/latest/mapSolarSystems.csv)

Link for download [mapSolarSystemJumps.csv](https://www.fuzzwork.co.uk/dump/latest/mapSolarSystemJumps.csv)

These files should be placed in folder 'input'

### Generate new graph

```bash
npm run generateGraph
```

### And build and start

```bash
npm run build
npm run exec
```

## How to use

When server will start you need send POST request

```javascript
// URL http://yoursite/route/origin/destination
// with body
{
  type: 'secure' // secure|insecure|shortest
  connections: [] // [solarSystemFrom, solarSystemTo][] 
}

// connections example
const AMARR = 30002187;
const J212812 = 31001180;
{
  type: 'secure'
  connections: [[AMARR, J212812]]
}
```

```TypeScript
 @Body('origin') origin: number,
 @Body('destinations') destinations: number[],
 @Body('flag') flag: SearchFlag,
 @Body('connections') connections?: string[],
 @Body('avoid') avoid?: number[],
 @Body('count') count?: number,

// URL http://yoursite/route/findClosest
// with body
{
    "origin": 31001027,
    "flag": "shortest",
    "connections": [
        "31001027|31000005",
        "31001027|30045348",
        "31001027|31000277",
        "31000005|31001027",
        "30045348|31001027",
        "30045348|30003127",
        "31000277|31001027",
        "31000277|30003881",
        "31000277|30000028",
        "31000277|30003127",
        "30003127|30045348",
        "30003127|31000277",
        "30003127|30001442",
        "30001442|30003127",
        "30001442|30000028",
        "30003881|31000277",
        "30000028|31000277",
        "30000028|30001442",
        "30000028|30000186",
        "30000186|30000028",
        "30000186|31002170"
    ],
    "avoid": [
        31000277
    ],
    "destinations": [
        31000005,
        30003127,
        30001442,
        30003881,
        31002170
    ],
    "count": 1
}


```

## License

[MIT licensed](LICENSE).
