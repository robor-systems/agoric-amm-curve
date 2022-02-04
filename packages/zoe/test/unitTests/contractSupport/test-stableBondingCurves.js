// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { getInputPrice } from '../../../src/contractSupport/index.js';

const testGetPrice = (
  t,
  { inputReserveIndex, outputReserveIndex, Reserves, inputValue },
  expectedOutput,
) => {
  const output = getInputPrice(
    inputReserveIndex,
    outputReserveIndex,
    Reserves,
    inputValue,
  );
  t.deepEqual(output, expectedOutput);
};


test('getInputPrice ok 2', t => {
  const input = {
    inputReserveIndex: 0,
    outputReserveIndex: 1,
    Reserves: [100000n, 100000n],
    inputValue: 100n,
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
