// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';

import { getInputPrice3 } from '../../../src/contractSupport/index.js';

const testGetPrice = (
  t,
  { inputValue, tokenIndexFrom, tokenIndexTo, poolValues },
  expectedOutput,
) => {
  const output = getInputPrice3(
    inputValue,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

test('Multiple tokens in the pool', t => {
  const input = {
    inputValue: 1000n,
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    poolValues: [100000n, 100n, 200n, 400n],
  };
  const expectedOutput = 0n;
  testGetPrice(t, input, expectedOutput);
});

test('large difference in pool amount', t => {
  const input = {
    inputValue: 1000n,
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: [1000000n, 200n],
  };
  const expectedOutput = 0n;
  testGetPrice(t, input, expectedOutput);
});
