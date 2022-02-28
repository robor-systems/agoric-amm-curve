// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { getD } from '@agoric/run-protocol/src/vpool-xyk-amm/stableSwapCurve.js';
import { floorMultiplyBy } from '@agoric/zoe/src/contractSupport/index.js';

const logResults = (poolValues, output) => {
  console.log('\npool :', poolValues);
  console.log('D :', output);
};

test('Test getD() : with 3 tokens same value', async t => {
  const values = [1000000n, 1000000n, 1000000n];
  const output = await getD(values);
  const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
  let dAmount = floorMultiplyBy(dummyAmount, output);
  logResults(values, dAmount.value);
  t.deepEqual(dAmount.value, 3000000n);
});

test('Test getD() : with 3 tokens', async t => {
  const values = [100000n, 10000n, 10n];
  const output = await getD(values);
  const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
  let dAmount = floorMultiplyBy(dummyAmount, output);
  logResults(values, dAmount.value);
  t.deepEqual(dAmount.value, 70399n);
});

test('Test getD() : with 2 tokens having extreme values but with output value', async t => {
  const values = [1000000n, 100n];
  const output = await getD(values);
  const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
  let dAmount = floorMultiplyBy(dummyAmount, output);
  logResults(values, dAmount.value);
  t.deepEqual(dAmount.value, 427377n);
});

test('Test getD() : testing Output Price result', async t => {
  const values = [1000000n, 10000n];
  const output = await getD(values);
  const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
  let dAmount = floorMultiplyBy(dummyAmount, output);
  logResults(values, dAmount.value);
  t.deepEqual(dAmount.value, 949792n);
});

test('Test getD() : testing Output Price result for 3 tokens', async t => {
  const values = [1000000n, 10000n, 10000n];
  const output = await getD(values);
  const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
  let dAmount = floorMultiplyBy(dummyAmount, output);
  logResults(values, dAmount.value);
  t.deepEqual(dAmount.value, 909817n);
});

// test('Test getD() : with 6 tokens different amounts', async t => {
//   const values = [
//     1000000n,
//     10000n,
//     100000n,
//     1000000n,
//     344233n,
//     114243434300004n,
//   ];
//   const output = await getD(values);
//   const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
//   let dAmount = floorMultiplyBy(dummyAmount, output);
//   logResults(values, dAmount.value);
//   t.deepEqual(dAmount.value, 97922945789346n);
// });

// test('Test getD() : with 2 tokens ', async t => {
//   const values = [9999999999999n, 10n];
//   const output = await getD(values);
//   const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
//   let dAmount = floorMultiplyBy(dummyAmount, output);
//   logResults(values, dAmount.value);
//   t.deepEqual(dAmount.value, 6666666668192n);
// });

// test('Test getD() : with 2 tokens having extreme values', async t => {
//   const values = [1000000000n, 10n];
//   const output = await getD(values);
//   const dummyAmount = AmountMath.make(output.numerator.brand, 1n);
//   let dAmount = floorMultiplyBy(dummyAmount, output);
//   logResults(values, dAmount.value);
//   t.deepEqual(dAmount.value, 666668193n);
// });
