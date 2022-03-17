// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import {
  makeRatio,
  floorMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { natSafeMath } from '../../../zoe/src/contractSupport/index.js';

const { floorDivide } = natSafeMath;
const A = 85n;
const BASIS_POINTS = 10000n;
const MAX_LOOP_LIMIT = 1000;

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
 *
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 * passed from the contract.
 * @returns {bigint} d - the current price, in value form
 *
 */
export const getD = poolValues => {
  const nCoins = BigInt(poolValues.length);
  // sumX  - Sum of all poolValues.
  const sumX = poolValues.reduce((prev, cur) => prev + cur, 0n);
  let dPrev;
  let d = sumX;
  const Ann = A * nCoins ** nCoins;
  // prodX : product of all poolvalues
  const prodX = poolValues.reduce((p, c) => p * c, 1n);
  const a = Ann - 1n;
  const sumXTimesAnn = Ann * sumX;
  for (let i = 0; i < MAX_LOOP_LIMIT; i += 1) {
    dPrev = d;
    // dp = D^(n+1)/n^n(prodX)
    const dp = d ** (nCoins + 1n) / (nCoins ** nCoins * prodX);

    // d = d(nCoins* dp + Ann_sumX) / ((nCoins +1)*dp + d*a )
    d = (d * (nCoins * dp + sumXTimesAnn)) / ((nCoins + 1n) * dp + d * a);
    if (Math.abs(Number(dPrev) - Number(d)) <= 1) {
      console.log(`D: ${i} iterations`);
      break;
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
 * @returns {bigint} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */
export const getY = (x, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const d = getD(poolValues);
  const nCoins = BigInt(poolValues.length);
  const Ann = A * nCoins ** nCoins;
  // s - is sum of all pool values apart from the
  // the swap out token's pool value.
  // prod` - is the product of all pool values apart
  // from the swap out token's poolValue.
  const prod =
    x *
    poolValues
      .filter((e, i) => i !== tokenIndexTo && i !== tokenIndexFrom)
      .reduce((p, n) => p * n, 1n);
  const s =
    x +
    poolValues
      .filter((e, i) => i !== tokenIndexTo && i !== tokenIndexFrom)
      .reduce((p, n) => p + n, 0n);

  // c=(D^(n+1))/(n^n)*prod`
  const c = d ** (nCoins + 1n) / (nCoins ** nCoins * prod);
  let yPrev;
  let y = d;
  let yNum = 1n;
  let yDenom = 1n;
  for (let i = 1; i < MAX_LOOP_LIMIT; i += 1) {
    yPrev = y;
    yNum = Ann * y ** 2n + c;
    yDenom = 2n * Ann * y + Ann * s + d * (1n - Ann);
    y = floorDivide(yNum, yDenom);
    // console.log('Y:', y);
    if (yPrev - y <= 1 && yPrev - y >= -1) {
      console.log(`C: ${i} iterations`);
      break;
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
 * @returns {bigint} outputValue - The amount to swap out and the price.
 *
 */
const calculateSwap = (dx, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const x = dx + poolValues[tokenIndexFrom];
  const y = getY(x, tokenIndexFrom, tokenIndexTo, poolValues);
  return poolValues[tokenIndexTo] - y;
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
  const {
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
  const outputBrand = poolAmounts[tokenIndexTo].brand;
  const priceRatio = makeRatioFromAmounts(
    AmountMath.make(outputBrand, swapResult),
    inputAmountWithoutFeeCut,
  );
  return {
    priceRatio,
    inputAmount: inputAmountWithoutFeeCut,
    outputAmount: AmountMath.make(outputBrand, swapResult),
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
 * @returns {Promise<{inputAmount:Amount,outputAmount:Amount}>}
 * returnValue - the input amount,the amout to be returned and the price of at which exchanged.
 */
export const getStableOutputPrice = async (
  outputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  poolAmounts,
) => {
  const t = tokenIndexTo;
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
  let inputAmount = AmountMath.make(outputAmount.brand, swapResult);
  // Offer Safety
  do {
    result = await getStableInputPrice(
      inputAmount,
      tokenIndexTo,
      tokenIndexFrom,
      poolAmounts,
    );
    if (result.outputAmount.value < outputAmount.value) {
      inputAmount = AmountMath.add(
        inputAmount,
        AmountMath.make(inputAmount.brand, 1n),
      );
    }
  } while (result.outputAmount.value < outputAmount.value);
  return {
    inputAmount,
    outputAmount,
  };
};
