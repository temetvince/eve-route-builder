#!/bin/sh

set -e

echo 'Start installing route-builder';

ROOT=$(pwd);

echo 'Install nestjs'
npm i -g @nestjs/cli

echo '_____________ INITIAL FOLDER STATE _____________'
ls -al
echo '_____________ INITIAL FOLDER STATE _____________'

echo "Download latest eve systems and routes";
if [ ! -d "$ROOT/eveData" ]; then
  mkdir -p "$ROOT/eveData";
fi


cd "$ROOT/eveData" || exit;
rm -f *

latestURLSystems='https://www.fuzzwork.co.uk/dump/latest/csv/mapSolarSystems.csv';
latestURLJumps='https://www.fuzzwork.co.uk/dump/latest/csv/mapSolarSystemJumps.csv';

echo '_____________ Download Systems _____________'
curl -fL --retry 3 -o mapSolarSystems.csv "${latestURLSystems}";
echo '_____________ Download Jumps _____________'
curl -fL --retry 3 -o mapSolarSystemJumps.csv "${latestURLJumps}";

echo " _____________ DUMP ----------------"
ls -al
echo " _____________ DUMP ----------------"

cd "$ROOT" || exit;

echo '_____________ BUILDER INSTALL NPM START _____________'
npm install;
echo '_____________ BUILDER INSTALL NPM FINISH _____________'

echo '_____________ GENERATE GRAPH START _____________'
npm run generateGraph;
echo '_____________ GENERATE GRAPH FINISH _____________'

echo '_____________ INSTALL NPM FINISH _____________'
npm run start:debug
