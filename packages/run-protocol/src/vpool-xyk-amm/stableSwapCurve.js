// @ts-check
import { assert, details as X } from '@agoric/assert';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import {
  makeRatio,
  floorMultiplyBy,
  makeRatioFromAmounts,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';

const A = 85n;
const BASIS_POINTS = 10000n;
const MAX_LOOP_LIMIT = 1000;

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
    inputAmountAfterFeeCut.value * BASIS_POINTS,
  );
  const basisRatio = makeRatio(BASIS_POINTS * 100n, inputAmount.brand);
  const inputAmountWithoutFeeCut = floorMultiplyBy(inputAmount, basisRatio);
  // Normalizing the poolValue according to Basis_Points
  // const poolAmountsInBasisPoints = poolAmounts.map(amount => {
  //   return floorMultiplyBy(
  //     amount,
  //     makeRatio(BASIS_POINTS * 100n, amount.brand),
  //   );
  // });
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
 * @param {Brand[]} poolBrands - Array of brand of each asset.Which is
 * passed from the contract.
 * @returns {Ratio} d - the current price, in value form
 *
 */
export const getD = (poolValues, poolBrands) => {
  const nCoins = BigInt(poolValues.length);
  const dummyBrand = makeIssuerKit('D').brand;
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
    // Non simplified form
    // d = d-(dp+d(Ann-1)-Ann*sumX )/(((dp*(n+1))/d)+(Ann-1))
    // val - ndp
    d = makeRatio(
      d.numerator.value *
        (nCoins * dp.numerator.value + Ann_sumX * dp.denominator.value),
      dummyBrand,
      (nCoins + 1n) * dp.numerator.value * d.denominator.value +
        d.numerator.value * BigInt(dp.denominator.value) * a,
    );
    const dummyAmount = AmountMath.make(dummyBrand, 1n);
    const dprevAmount = floorMultiplyBy(dummyAmount, d_prev);
    dAmount = floorMultiplyBy(dummyAmount, d);
    console.log('dAmount:', dAmount);
    console.log('dprevAmount:', dprevAmount);
    if (Number(dprevAmount.value) - Number(dAmount.value) <= 1) {
      return d;
    } else if (Number(dAmount.value) - Number(dprevAmount.value) <= 1) {
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
 * @param {Brand[]} poolBrands - Array of brand of each asset.Which is
 * passed from the contract.
 * @returns {bigint} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */

export const getY = (
  x,
  tokenIndexFrom,
  tokenIndexTo,
  poolValues,
  poolBrands,
) => {
  const d = getD(poolValues, poolBrands);
  const nCoins = BigInt(poolValues.length);
  const Ann = A * nCoins ** nCoins;
  let c = d;
  let s = 0n;
  let _x;
  let xi;
  // sum` - is sum of all pool values apart from the
  // the swap out token's pool value.
  // prod` - is the product of all pool values apart
  // from the swap out token's poolValue.
  // s = sum`
  // c=(D^(n+1))/(n^n)*prod`
  for (let i = 0; i < nCoins; i++) {
    if (i === tokenIndexFrom) {
      _x = x;
      xi = x;
    } else if (i !== tokenIndexTo) {
      _x = poolValues[i];
      xi = poolValues[i];
    } else {
      _x = 0n;
      xi = 1n;
    }
    s += _x;
    c = (c * d) / (xi * nCoins);
  }
  let y_prev;
  let y = d;
  for (let i = 0; i < MAX_LOOP_LIMIT; i++) {
    y_prev = y;
    // yi+1=yi-((Ann*y^2)+Ann*s*y-d*y*(Ann-1)-c)/(2Ann*y+Ann*s+D(Ann-1))
    y =
      y -
      (Ann * (y * y) + Ann * s * y - d * y * (Ann - 1n) - c) /
        (2n * Ann * y + Ann * s - d * (Ann - 1n));
    if (within10(y, y_prev)) {
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
 * @param {Brand[]} poolBrands - Array of brand of each asset.Which is
 * passed from the contract.
 * @returns {{ outputValue: bigint}} outputValue - The amount to swap out and the price.
 *
 */

const calculateSwap = (
  dx,
  tokenIndexFrom,
  tokenIndexTo,
  poolValues,
  poolBrands,
) => {
  const x = dx + poolValues[tokenIndexFrom];
  const y = getY(x, tokenIndexFrom, tokenIndexTo, poolValues, poolBrands);
  const dy = poolValues[tokenIndexTo] - y;
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
    poolBrands,
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
    poolBrands,
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
    inputAmountWithoutFeeCut.value / BASIS_POINTS,
  );
  outputAmount = AmountMath.make(
    outputAmount.brand,
    swapResult.outputValue / BASIS_POINTS,
  );
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
 * @returns {Promise<{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount}>}
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
  const basisRatio = makeRatio(BASIS_POINTS * 100n, outputAmount.brand);
  let outputAmountBasis = floorMultiplyBy(outputAmount, basisRatio);
  let { inputAmountAfterFeeCut, poolValues } = commonStablePrice(
    outputAmount,
    poolAmounts,
    tokenIndexFrom,
    tokenIndexTo,
    feeBasisPoints,
  );
  const swapResult = calculateSwap(
    outputAmountBasis.value,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  const inputAmount = AmountMath.make(
    poolAmounts[tokenIndexTo].brand,
    swapResult.outputValue,
  );
  const feeCutRatio = makeRatio(
    BASIS_POINTS - feeBasisPoints,
    inputAmount.brand,
    BASIS_POINTS,
    inputAmount.brand,
  );
  // Fee ratio multiplied by inputAmount to get inputAmount After fee cut
  inputAmountAfterFeeCut = floorDivideBy(inputAmount, feeCutRatio);
  inputAmountAfterFeeCut = AmountMath.make(
    inputAmountAfterFeeCut.brand,
    inputAmountAfterFeeCut.value / BASIS_POINTS,
  );
  // Ensure Offer Saftey
  let result;
  let condition;
  do {
    result = await getStableInputPrice(
      inputAmountAfterFeeCut,
      tokenIndexTo,
      tokenIndexFrom,
      poolAmounts,
    );
    condition = result.outputAmount.value < outputAmount.value;
    if (condition) {
      let incrementAmount = AmountMath.make(inputAmountAfterFeeCut.brand, 1n);
      inputAmountAfterFeeCut = AmountMath.add(
        inputAmountAfterFeeCut,
        incrementAmount,
      );
    }
  } while (condition);
  const priceRatio = makeRatioFromAmounts(
    result.priceRatio.numerator,
    result.priceRatio.denominator,
  );
  return {
    priceRatio: priceRatio,
    inputAmount: inputAmountAfterFeeCut,
    outputAmount: outputAmount,
  };
};
