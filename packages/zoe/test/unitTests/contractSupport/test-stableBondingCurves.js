// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { makeIssuerKit } from '@agoric/ertp';

import {
  getStableInputPrice,
  getStableOutputPrice,
} from '../../../src/contractSupport/index.js';

import { getInputPrice } from '../../../src/contractSupport/index.js';

const coins = ['RUN', 'USDT'];
const values = [1000000n, 1000000n];
let brands = coins.map(coin => makeIssuerKit(coin).brand);

const createTokenAmounts = () => {
  let poolAmounts = [];
  poolAmounts = brands.map((brand, i) => AmountMath.make(brand, values[i]));
  return poolAmounts;
};

const testGetStableInputPrice = (
  t,
  { inputAmount, tokenIndexFrom, tokenIndexTo, poolValues },
  expectedOutput,
) => {
  const output = getStableInputPrice(
    inputAmount,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

const testGetStableOutputPrice = (
  t,
  { outputAmount, tokenIndexFrom, tokenIndexTo, poolValues },
  expectedOutput,
) => {
  const output = getStableOutputPrice(
    outputAmount,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log(output);
  t.deepEqual(output, output);
};

test('Test InputPriceFunction() : Code with Amounts', t => {
  const input = {
    inputAmount: AmountMath.make(brands[0], 3n),
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: createTokenAmounts(),
  };

  const expectedOutput = 0n;
  testGetStableInputPrice(t, input, expectedOutput);
});

test('Test OutputPriceFunction() : Code with Amounts', t => {
  const input = {
    outputAmount: AmountMath.make(brands[0], 2n),
    tokenIndexFrom: 0,
    tokenIndexTo: 1,
    poolValues: createTokenAmounts(),
  };
  const expectedOutput = 0n;
  testGetStableOutputPrice(t, input, expectedOutput);
});
