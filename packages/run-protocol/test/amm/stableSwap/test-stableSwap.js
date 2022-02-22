// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import {
  getStableOutputPrice,
  getStableInputPrice,
} from '@agoric/run-protocol/src/vpool-xyk-amm/stableSwapCurve.js';

const createTokenAmounts = (values, brands) => {
  let poolAmounts = [];
  poolAmounts = brands.map((brand, i) => AmountMath.make(brand, values[i]));
  return poolAmounts;
};
const logResults = (input, output) => {
  console.log(
    'price Ratio: ',
    Number(output.priceRatio.numerator.value) /
      Number(output.priceRatio.denominator.value),
  );
  console.log('InputAmount:', input.inputAmount.value);
  console.log('OutputAmount:', output.outputAmount.value);
};
const logResultsForOutput = (input, output) => {
  console.log(
    'price Ratio: ',
    Number(output.priceRatio.numerator.value) /
      Number(output.priceRatio.denominator.value),
  );
  console.log('InputAmount:', output.inputAmount.value);
  console.log('OutputAmount:', input.outputAmount.value);
};

// test('Test inputPrice() : with 3 tokens and swap through centralToken', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 100000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 1000n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 1 : with 3 tokens and swap through centralToken\n');
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 991n);
// });

test('Test inputPrice() : with 2 tokens ', async t => {
  const coins = ['RUN', 'USDT'];
  const values = [1000000n, 100000n];
  const brands = coins.map(coin => makeIssuerKit(coin).brand);

  const input = {
    inputAmount: AmountMath.make(brands[1], 1000n),
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    centralTokenIndex: 0,
    poolAmounts: createTokenAmounts(values, brands),
  };
  let expectedOutput = 0n;
  const output = await getStableInputPrice(
    input.inputAmount,
    input.tokenIndexFrom,
    input.tokenIndexTo,
    input.centralTokenIndex,
    input.poolAmounts,
  );
  console.log('\nTest 2 : with 2 tokens and one of the token is central\n');
  logResults(input, output);
  expectedOutput = output.outputAmount.value;
  t.deepEqual(expectedOutput, 1081n);
});

// test('Test inputPrice() : with 2 tokens having extreme values', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [1000000n, 100n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[0], 1000n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log(
//     '\nTest 3 : with 2 tokens having extreme values results in no output value\n',
//   );
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 0n);
// });

// test('Test inputPrice() : with 2 tokens having extreme values but with output value', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [1000000n, 100n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[0], 4000n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log(
//     '\nTest 4 : with 2 tokens having extreme values results in some output\n',
//   );
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 1n);
// });

// test('Test outputPrice() : with 2 tokens', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [1000000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     outputAmount: AmountMath.make(brands[1], 1000n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableOutputPrice(
//     input.outputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 5 : with 2 tokens getting OutputAmount\n');
//   logResultsForOutput(input, output);
//   expectedOutput = output.inputAmount.value;
//   t.deepEqual(expectedOutput, 11777n);
// });

// test('Test inputPrice() : testing Output Price result', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [1000000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);
//   const input = {
//     inputAmount: AmountMath.make(brands[0], 11777n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 6 : Verifying Output Price function result\n');
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.assert(expectedOutput >= 1000n);
// });

// test('Test outputPrice() : with 3 tokens', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     outputAmount: AmountMath.make(brands[0], 1000n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 0,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableOutputPrice(
//     input.outputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 7 : with 3 tokens getting OutputAmount\n');
//   logResultsForOutput(input, output);
//   expectedOutput = output.inputAmount.value;
//   t.deepEqual(expectedOutput, 41n);
// });

// test('Test inputPrice() : testing Output Price result for 3 tokens', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 41n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 0,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 8 : Verifying Output Price function result\n');
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.assert(expectedOutput > 1000n);
// });

// test('Test outputPrice() : with 3 tokens different poolAmounts', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     outputAmount: AmountMath.make(brands[1], 600n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableOutputPrice(
//     input.outputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log(
//     '\nTest 9 : with 3 tokens getting OutputAmount for different token amounts\n',
//   );
//   logResultsForOutput(input, output);
//   expectedOutput = output.inputAmount.value;
//   t.deepEqual(expectedOutput, 101n);
// });

// test('Test inputPrice() : with 3 tokens different amounts and swap through centralToken', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 101n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     centralTokenIndex: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   let expectedOutput = 0n;
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.centralTokenIndex,
//     input.poolAmounts,
//   );
//   console.log('\nTest 10 : with 3 tokens and swap through centralToken\n');
//   logResults(input, output);
//   expectedOutput = output.outputAmount.value;
//   t.assert(expectedOutput >= 600n);
// });
