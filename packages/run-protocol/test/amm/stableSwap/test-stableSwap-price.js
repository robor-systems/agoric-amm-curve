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
const logResults = (input, output, i) => {
  console.log(
    '\nprice Ratio: ',
    Number(i == 0 ? output.outputAmount.value : input.outputAmount.value) /
      Number(i == 0 ? input.inputAmount.value : output.inputAmount.value),
  );

  console.log(
    'InputAmount:',
    i == 0 ? input.inputAmount.value : output.inputAmount.value,
  );
  console.log(
    'OutputAmount:',
    i == 0 ? output.outputAmount.value : input.outputAmount.value,
  );
};

// test('Test inputPrice() : with 3 tokens and swap through centralToken', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 100000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 1000n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 0);
//   const expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 997n);
// });

// test('Test inputPrice() : with 2 tokens ', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [100000n, 1000000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[0], 1000n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 0);
//   const expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 1082n);
// });

// test('Test inputPrice() : with 2 tokens having extreme values', async t => {
//   const coins = ['RUN', 'USDT'];
//   const values = [1000000n, 100n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[0], 1000n),
//     tokenIndexFrom: 0,
//     tokenIndexTo: 1,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 0);
//   const expectedOutput = output.outputAmount.value;
//   t.deepEqual(expectedOutput, 1n);
// });

test('Test outputPrice() : with 2 tokens', async t => {
  const coins = ['RUN', 'USDT'];
  const values = [1000000n, 10000n];
  const brands = coins.map(coin => makeIssuerKit(coin).brand);

  const input = {
    outputAmount: AmountMath.make(brands[1], 1000n),
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    poolAmounts: createTokenAmounts(values, brands),
  };
  const output = await getStableOutputPrice(
    input.outputAmount,
    input.tokenIndexFrom,
    input.tokenIndexTo,
    input.poolAmounts,
  );
  logResults(input, output, 1);
  const expectedOutput = output.inputAmount.value;
  t.deepEqual(expectedOutput, 145n);
});

test('Test inputPrice() : testing Output Price result', async t => {
  const coins = ['RUN', 'USDT'];
  const values = [1000000n, 10000n];
  const brands = coins.map(coin => makeIssuerKit(coin).brand);
  const input = {
    inputAmount: AmountMath.make(brands[0], 147n),
    tokenIndexFrom: 1,
    tokenIndexTo: 0,
    poolAmounts: createTokenAmounts(values, brands),
  };
  const output = await getStableInputPrice(
    input.inputAmount,
    input.tokenIndexFrom,
    input.tokenIndexTo,
    input.poolAmounts,
  );
  logResults(input, output, 0);
  const expectedOutput = output.outputAmount.value;
  t.assert(expectedOutput >= 1000n);
});

// test('Test outputPrice() : with 3 tokens', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     outputAmount: AmountMath.make(brands[1], 605n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableOutputPrice(
//     input.outputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 1);
//   const expectedOutput = output.inputAmount.value;
//   t.deepEqual(expectedOutput, 57n);
// });

// test('Test inputPrice() : testing Output Price result for 3 tokens', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 10000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 57n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 0,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 0);
//   const expectedOutput = output.outputAmount.value;
//   t.assert(expectedOutput >= 605n);
// });

// test('Test outputPrice() : with 3 tokens different poolAmounts', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     outputAmount: AmountMath.make(brands[1], 600n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableOutputPrice(
//     input.outputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 1);
//   const expectedOutput = output.inputAmount.value;
//   t.deepEqual(expectedOutput, 230n);
// });

// test('Test inputPrice() : with 3 tokens different amounts and swap through centralToken', async t => {
//   const coins = ['RUN', 'USDT', 'DAI'];
//   const values = [1000000n, 10000n, 100000n];
//   const brands = coins.map(coin => makeIssuerKit(coin).brand);

//   const input = {
//     inputAmount: AmountMath.make(brands[1], 230n),
//     tokenIndexFrom: 1,
//     tokenIndexTo: 2,
//     poolAmounts: createTokenAmounts(values, brands),
//   };
//   const output = await getStableInputPrice(
//     input.inputAmount,
//     input.tokenIndexFrom,
//     input.tokenIndexTo,
//     input.poolAmounts,
//   );
//   logResults(input, output, 0);
//   const expectedOutput = output.outputAmount.value;
//   t.assert(expectedOutput >= 600n);
// });
