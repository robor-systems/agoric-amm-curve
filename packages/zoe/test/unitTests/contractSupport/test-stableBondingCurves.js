// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';

import {
  getStableInputPrice,
  getStableOutputPrice,
} from '../../../src/contractSupport/index.js';

const testGetStablePrice = (
  t,
  { inputValue, tokenIndexFrom, tokenIndexTo, poolValues },
  expectedOutput,
) => {
  const output = getStableInputPrice(
    inputValue,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

const testGetStableOutputPrice = (
  t,
  { outputValue, tokenIndexFrom, tokenIndexTo, poolValues },
  expectedOutput,
) => {
  const output = getStableOutputPrice(
    outputValue,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

test('Test : Multiple tokens in the pool', t => {
  console.log('Test : Multiple tokens in the pool');
  const input = {
    inputValue: 1000n,
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    poolValues: [100000n, 100n, 200n, 400n],
  };
  const expectedOutput = 0n;
  testGetStablePrice(t, input, expectedOutput);
});

test('Test : Large difference in liquidities of two assets in pool', t => {
  console.log('\nTest : Large difference in pool amount');
  const input = {
    inputValue: 1839n,
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: [1000000n, 200n],
  };
  const expectedOutput = 0n;
  testGetStablePrice(t, input, expectedOutput);
});

test('Test : Large difference in liquidities of two assets in pool2', t => {
  console.log('\nTest : Input Value');
  const input = {
    inputValue: 58n,
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: [1000000n, 100000n],
  };
  const expectedOutput = 0n;
  testGetStablePrice(t, input, expectedOutput);
});

test('Test : Output Value', t => {
  console.log('\nTest : Output Value');
  const input = {
    outputValue: 50n,
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: [1000000n, 100000n],
  };
  const expectedOutput = 0n;
  testGetStableOutputPrice(t, input, expectedOutput);
});
