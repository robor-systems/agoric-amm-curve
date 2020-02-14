#! /usr/bin/env node
import fs from 'fs';
import process from 'process';
import bundleSource from '@agoric/bundle-source';

import url from 'url';
import path from 'path';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // const esend = require.resolve(`@agoric/eventual-send`);
  const esend = path.join(__dirname, '../../eventual-send/src/index.js');
  console.log(esend);
  const bundle = await bundleSource(esend);

  const fileContents = `export default ${JSON.stringify(bundle)};`;
  try {
    await fs.promises.mkdir('src/bundles');
  } catch (e) {
    if (!e || e.code !== 'EEXIST') {
      throw e;
    }
  }
  await fs.promises.writeFile('src/bundles/eventual-send.js', fileContents);
}

main().then(
  _ => process.exit(0),
  err => {
    console.log('error creating src/bundles/eventual-send.js:');
    console.log(err);
    process.exit(1);
  },
);
