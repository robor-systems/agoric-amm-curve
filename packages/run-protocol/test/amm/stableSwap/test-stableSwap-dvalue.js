// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { getD } from '@agoric/run-protocol/src/vpool-xyk-amm/stableSwapCurve.js';

const logResults = (poolValues, output) => {
  console.log('\npool :', poolValues);
  console.log('D :', output);
};

test('Test getD() : with 3 tokens same value', async t => {
  const values = [1000000n, 1000000n, 1000000n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput == 3000000n);
});

test('Test getD() : with 3 tokens', async t => {
  const values = [100000n, 10000n, 10n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput > 1000n);
});

test('Test getD() : with 2 tokens ', async t => {
  const values = [9999999999999n, 10n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput > 1000n);
});

test('Test getD() : with 2 tokens having extreme values', async t => {
  const values = [1000000000n, 1000n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput > 1000n);
});

test('Test getD() : with 2 tokens having extreme values but with output value', async t => {
  const values = [1000000n, 100n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput >= 1000n);
});

test('Test getD() : testing Output Price result', async t => {
  const values = [1000000n, 10000n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput >= 1000n);
});

test('Test getD() : testing Output Price result for 3 tokens', async t => {
  const values = [1000000n, 10000n, 10000n];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput >= 1000n);
});

test('Test getD() : with 6 tokens different amounts', async t => {
  const values = [
    1000000n,
    10000n,
    100000n,
    1000000n,
    344233n,
    114243434300004n,
  ];
  const output = await getD(values);
  logResults(values, output);
  const expectedOutput = output;
  t.assert(expectedOutput >= 1000n);
});
