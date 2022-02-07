// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  getInputPrice,
  getInputPrice2,
  getInputPrice3,
} from '../../../src/contractSupport/index.js';

const testGetPrice = (
  t,
  { inputReserveIndex, outputReserveIndex, Reserves, inputValue },
  expectedOutput,
) => {
  const output = getInputPrice3(
    inputReserveIndex,
    outputReserveIndex,
    Reserves,
    inputValue,
  );
  t.deepEqual(output, expectedOutput);
};

test('getInputPrice()', t => {
  const input = {
    inputReserveIndex: 0,
    outputReserveIndex: 1,
    Reserves: [100000n, 100n],
    inputValue: 1000n,
  };
  const expectedOutput = 0n;
  testGetPrice(t, input, expectedOutput);
});

// test('getInputPrice ok 2', t => {
//   const input = {
//     inputReserveIndex: 0,
//     outputReserveIndex: 1,
//     Reserves: [100000n, 1000n],
//     inputValue: 100n,
//   };
//   const expectedOutput = 0n;
//   testGetPrice(t, input, expectedOutput);
// });
