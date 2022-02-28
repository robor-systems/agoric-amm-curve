// @ts-check
import { assert, details as X } from '@agoric/assert';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import {
  makeRatio,
  floorMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';

const A = 85n;
const BASIS_POINTS = 10000n;
const MAX_LOOP_LIMIT = 1000;
const dummyBrand = makeIssuerKit('D').brand;
const dummyAmount = AmountMath.make(dummyBrand, 1n);

const within10 = (a, b) => {
  if (a > b) {
    return a - b <= 10;
  }
  return b - a <= 10;
};

/**
 * Common functionality in getInputAmount and getOuptutAmount
 * @param {Amount} inputAmount - the Amount of the asset sent
 * in to be swapped.
 * @param {Amount[]} poolAmounts - Array of amounts of each asset.Which is
 *                                passed from the contract.
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 *                                  in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 *                                in the reserves array.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 *                                        in exchange
 * @returns {{inputAmountAfterFeeCut:Amount, inputAmountWithoutFeeCut:Amount, poolValues: bigint[],poolBrands:Brand[] }} output - recomputed pool values
 */
const commonStablePrice = (
  inputAmount,
  poolAmounts,
  tokenIndexFrom,
  tokenIndexTo,
  feeBasisPoints = 30n,
) => {
  const inputReserve = poolAmounts[tokenIndexFrom];
  const outputReserve = poolAmounts[tokenIndexTo];
  assert(
    inputAmount.value > 0n,
    X`inputValue ${inputAmount.value} must be positive`,
  );
  assert(
    inputReserve.value > 0n,
    X`inputReserve ${inputReserve.value} must be positive`,
  );
  assert(
    outputReserve.value > 0n,
    X`outputReserve ${outputReserve.value} must be positive`,
  );
  // Fee ratio calculation
  const feeCutRatio = makeRatio(
    BASIS_POINTS - feeBasisPoints,
    inputAmount.brand,
    BASIS_POINTS,
    inputAmount.brand,
  );
  // Fee ratio multiplied by inputAmount to get inputAmount After fee cut
  let inputAmountAfterFeeCut = floorMultiplyBy(inputAmount, feeCutRatio);
  // Normalizing input amount according to pool value
  inputAmountAfterFeeCut = AmountMath.make(
    inputAmountAfterFeeCut.brand,
    inputAmountAfterFeeCut.value,
  );
  const inputAmountWithoutFeeCut = inputAmount;
  const poolValues = poolAmounts.map(amount => amount.value);
  const poolBrands = poolAmounts.map(amount => amount.brand);

  return {
    inputAmountAfterFeeCut,
    inputAmountWithoutFeeCut,
    poolValues,
    poolBrands,
  };
};

/**
 * Computes the Stable Swap invariant (D).
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 * passed from the contract.
 * @returns {Ratio} d - the current price, in value form
 *
 */
export const getD = poolValues => {
  const nCoins = BigInt(poolValues.length);
  // sumX  - Sum of all poolValues.
  const sumX = poolValues.reduce((prev, cur) => prev + cur, 0n);
  let d_prev;
  let d = makeRatio(sumX * 100n, dummyBrand);
  const Ann = A * nCoins ** nCoins;
  const prodX = poolValues.reduce((p, c) => p * c, 1n);
  const a = Ann - 1n;
  const Ann_sumX = Ann * sumX;
  let dAmount = AmountMath.make(dummyBrand, 1n);
  for (let i = 0; i < MAX_LOOP_LIMIT; i++) {
    // prodX : product of all poolvalues
    // dp = D^(n+1)/n^n(prodX)
    const dp = makeRatio(
      d.numerator.value ** (nCoins + 1n),
      dummyBrand,
      nCoins ** nCoins * prodX * d.denominator.value ** (nCoins + 1n),
    );
    d_prev = d;
    // numerator = (d*n*(nCoins*dp.n+b(dp.d)))
    // denominator= (((nCoins+1)*dp.n*d.d )+(d.n*dp.d*a))
    d = makeRatio(
      d.numerator.value *
        (nCoins * dp.numerator.value + Ann_sumX * dp.denominator.value),
      dummyBrand,
      (nCoins + 1n) * dp.numerator.value * d.denominator.value +
        d.numerator.value * BigInt(dp.denominator.value) * a,
    );
    const dprevAmount = floorMultiplyBy(dummyAmount, d_prev);
    dAmount = floorMultiplyBy(dummyAmount, d);
    if (Math.abs(Number(dprevAmount.value) - Number(dAmount.value)) <= 1) {
      return d;
    }
  }
  return d;
};

/**
 * Compute the swap amount `y` in proportion to `x`.
 *
 * @param {bigint} x - index of amount of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 * passed from the contract.
 * @returns {Ratio} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */

export const getY = (x, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const d = getD(poolValues);
  const dAmount = floorMultiplyBy(dummyAmount, d);
  const nCoins = BigInt(poolValues.length);
  const Ann = A * nCoins ** nCoins;
  // s - is sum of all pool values apart from the
  // the swap out token's pool value.
  // prod` - is the product of all pool values apart
  // from the swap out token's poolValue.
  // c=(D^(n+1))/(n^n)*prod`
  const prod =
    x *
    poolValues
      .filter((e, i) => i != tokenIndexTo && i != tokenIndexFrom)
      .reduce((p, n) => p * n, 1n);
  const s =
    x +
    poolValues
      .filter((e, i) => i != tokenIndexTo && i != tokenIndexFrom)
      .reduce((p, n) => p + n, 0n);
  const c = makeRatio(
    d.numerator.value ** (nCoins + 1n),
    dummyBrand,
    d.denominator.value ** (nCoins + 1n) * nCoins ** nCoins * prod,
  );
  let y_prev;
  let y = d;
  for (let i = 1; i < MAX_LOOP_LIMIT; i++) {
    y_prev = y;
    // Numerator =  (d.d(A*n**n * (y.n)**2 * (c.d) + (c.n)(y.d)**2))
    // Denominator = (y.d * c.d (2*A*n**n * d.d + A*n**n * s * y.d * d.d + d.n y.d * (1-A*n**n)))
    y = makeRatio(
      BigInt(d.denominator.value) *
        (Ann * BigInt(y.numerator.value ** 2n) * c.denominator.value +
          c.numerator.value * BigInt(y.denominator.value ** 2n)),
      dummyBrand,
      BigInt(y.denominator.value) *
        c.denominator.value *
        (2n * Ann * y.numerator.value * d.denominator.value +
          Ann * s * y.denominator.value * d.denominator.value +
          d.numerator.value * BigInt(y.denominator.value) * (1n - Ann)),
    );
    const yAmount = floorMultiplyBy(dummyAmount, y);
    const yprevAmount = floorMultiplyBy(dummyAmount, y_prev);
    if (Math.abs(Number(yprevAmount.value) - Number(yAmount.value)) <= 1) {
      return y;
    }
  }
  return y;
};
/**
 * Contains the logic for calculating the stableSwap rate for
 * between assets in a pool.Also to returns the amount of token
 * to be returned in exchange of the swapped in or out token.
 *
 * @param {bigint} dx - the value of the asset sent in to be swapped in or out.
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of amount of each asset.Which is
 * passed from the contract.
 * @returns {{ outputValue: bigint}} outputValue - The amount to swap out and the price.
 *
 */

const calculateSwap = (dx, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const x = dx + poolValues[tokenIndexFrom];
  const y = getY(x, tokenIndexFrom, tokenIndexTo, poolValues);
  const dummyAmount = AmountMath.make(dummyBrand, 1n);
  const yAmount = floorMultiplyBy(dummyAmount, y);
  const dy = poolValues[tokenIndexTo] - yAmount.value;
  return { outputValue: dy };
};
/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {Amount} inputAmount - the Amount of the asset sent
 * in to be swapped.
 * @param {number} tokenIndexFrom - index of input token amount in poolAmounts array.
 * @param {number} tokenIndexTo - index of output token amount in poolAmounts array.
 * @param {Amount[]} poolAmounts - Array of Amounts of each token in the pool.Which is passed
 * from the function.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {Promise<{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount}>}
 * returnValue - the input amount,the amout to be returned  and the price of at which exchanged.
 *
 */
export const getStableInputPrice = async (
  inputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  poolAmounts,
  feeBasisPoints = 30n,
) => {
  let {
    inputAmountAfterFeeCut,
    inputAmountWithoutFeeCut,
    poolValues,
  } = commonStablePrice(
    inputAmount,
    poolAmounts,
    tokenIndexFrom,
    tokenIndexTo,
    feeBasisPoints,
  );
  const swapResult = calculateSwap(
    inputAmountAfterFeeCut.value,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  let outputAmount = AmountMath.make(
    poolAmounts[tokenIndexTo].brand,
    swapResult.outputValue,
  );
  const priceRatio = makeRatioFromAmounts(
    outputAmount,
    inputAmountWithoutFeeCut,
  );
  inputAmountWithoutFeeCut = AmountMath.make(
    inputAmountWithoutFeeCut.brand,
    inputAmountWithoutFeeCut.value,
  );
  outputAmount = AmountMath.make(outputAmount.brand, swapResult.outputValue);
  return {
    priceRatio: priceRatio,
    inputAmount: inputAmountWithoutFeeCut,
    outputAmount: outputAmount,
  };
};

/**
 * Contains the logic for calculating how much should be taken
 * from the user in exchange for what they want to obtain. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {Amount} outputAmount - the value of the asset the user wants
 * to get
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 * in the reserves array.
 * @param {Amount[]} poolAmounts - Array of amounts of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {Promise<{inputAmount:Amount,outputAmount:Amount}>}
 * returnValue - the input amount,the amout to be returned and the price of at which exchanged.
 */
export const getStableOutputPrice = async (
  outputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  poolAmounts,
  feeBasisPoints = 30n,
) => {
  let t = tokenIndexTo;
  tokenIndexTo = tokenIndexFrom;
  tokenIndexFrom = t;
  let result;
  const poolValues = poolAmounts.map(amount => amount.value);
  const swapResult = calculateSwap(
    outputAmount.value,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  let inputAmount = AmountMath.make(outputAmount.brand, swapResult.outputValue);
  // Offer Saftey
  do {
    result = await getStableInputPrice(
      inputAmount,
      tokenIndexTo,
      tokenIndexFrom,
      poolAmounts,
    );
    console.log('Input Amount:', inputAmount);
    console.log('result.outputAmount.value:', result.outputAmount.value);
    if (result.outputAmount.value < outputAmount.value) {
      inputAmount = AmountMath.add(
        inputAmount,
        AmountMath.make(inputAmount.brand, 1n),
      );
    }
  } while (result.outputAmount.value < outputAmount.value);
  return {
    inputAmount: inputAmount,
    outputAmount: outputAmount,
  };
};
