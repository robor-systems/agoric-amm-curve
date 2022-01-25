import '@agoric/install-ses/pre-bundle-source.js';
import '@agoric/install-ses';
import fs from 'fs';
import path from 'path';
import bundleSource from '@agoric/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const srcDir = `${dirname}/../src`;
const bundlesDir = `${dirname}/../bundles`;

async function writeSourceBundle(contractFilename, outputPath) {
  const contractUrl = await importMetaResolve(
    contractFilename,
    import.meta.url,
  );
  const contractPath = new URL(contractUrl).pathname;
  await bundleSource(contractPath).then(bundle => {
    // TODO: fix
    // @ts-ignore mkdirSync believes it only accepts 2 arguments.
    fs.mkdirSync(bundlesDir, { recursive: true }, err => {
      if (err) throw err;
    });
    fs.writeFileSync(outputPath, `export default ${JSON.stringify(bundle)};`);
  });
}

async function main() {
  const contractOutputs = [
    [
      `${srcDir}/vaultFactory/contracts/vaultFactory.js`,
      `${bundlesDir}/bundle-vaultFactory.js`,
    ],
    [
      `${srcDir}/vaultFactory/contracts/liquidateMinimum.js`,
      `${bundlesDir}/bundle-liquidateMinimum.js`,
    ],
    [
      `${srcDir}/vpool-xyk-amm/contracts/multipoolMarketMaker.js`,
      `${dirname}/../bundles/bundle-amm.js`,
    ],
    [
      '@agoric/governance/src/contracts/contractGovernor.js',
      `${dirname}/../bundles/bundle-contractGovernor.js`,
    ],
    [
      '@agoric/governance/src/contracts/committee.js',
      `${dirname}/../bundles/bundle-committee.js`,
    ],
    [
      '@agoric/governance/src/contracts/noActionElectorate.js',
      `${dirname}/../bundles/bundle-noActionElectorate.js`,
    ],
    [
      '@agoric/governance/src/contracts/binaryVoteCounter.js',
      `${dirname}/../bundles/bundle-binaryVoteCounter.js`,
    ],
  ];
  for (const [contractFilename, outputPath] of contractOutputs) {
    // eslint-disable-next-line no-await-in-loop
    await writeSourceBundle(contractFilename, outputPath);
  }
}

await main();
