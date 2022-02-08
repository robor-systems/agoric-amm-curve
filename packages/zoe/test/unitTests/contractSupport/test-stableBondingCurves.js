// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

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
  t.deepEqual(output, expectedOutput);
};

test('getInputPrice()', t => {
  const input = {
    inputValue: 1000n,
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    poolValues: [100000n, 100n, 200n, 400n],
  };
  const expectedOutput = 0n;
  testGetPrice(t, input, expectedOutput);
});
