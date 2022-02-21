// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { AmountMath } from '@agoric/ertp';
import {
  makeRatio,
  floorMultiplyBy,
  makeRatioFromAmounts,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';

const A = 85;
const BASIS_POINTS = 10000n;

const within10 = (a, b) => {
  if (a > b) {
    return a - b <= 10;
  }
  return b - a <= 10;
};

/**
 * Recompute the pool values after a swap is performed
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 *                                passed from the contract.
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 *                                  in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 *                                in the reserves array.
 * @param {bigint} inputTokenValue - the value of swap in token passed in.
 * @param {bigint} outputTokenValue - the value of swap out token returned
 *                                    in exchange
 * @returns {bigint[]} output - recomputed pool values
 */
const updatePoolValues = (
  poolValues,
  tokenIndexFrom,
  inputTokenValue,
  tokenIndexTo,
  outputTokenValue,
) => {
  poolValues[tokenIndexFrom] -= inputTokenValue;
  poolValues[tokenIndexTo] += outputTokenValue;
  return poolValues;
};

/**
 * Computes the Stable Swap invariant (D).
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 * passed from the contract.
 * @returns {bigint} d - the current price, in value form
 *
 */
const getD = poolValues => {
  let N_COINS = poolValues.length;
  let sum_x = 0n;

  // sum_x - Sum of all poolValues.
  for (let i = 0; i < N_COINS; i++) {
    sum_x = sum_x + poolValues[i];
  }
  if (sum_x === 0n) {
    return 0n;
  }
  let d_prev = 0n;
  let d = sum_x;
  let nA = A * N_COINS;

  for (let i = 0; i < 1000; i++) {
    let dp = d;
    // prod - product of all poolvalues
    // dp = D^(n+1)/n^n(prod)
    for (let j = 0; j < N_COINS; j++) {
      dp = (dp * d) / (poolValues[j] * Nat(N_COINS));
    }

    d_prev = d;

    // numerator = An(sum) + ((D^(n+1)/n^n(prod))*nD)
    // denominator = ((An-1)*D)+(n+1)(D^(n+1)/n^n(prod))
    // d = numerator/denominator
    d =
      ((Nat(nA) * sum_x + dp * Nat(N_COINS)) * d) /
      ((Nat(nA) - 1n) * Nat(d) + Nat(N_COINS + 1) * dp);
    if (within10(d, d_prev)) {
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
 * @returns {bigint} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */

const getY = (x, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const d = getD(poolValues);
  let N_COINS = poolValues.length;
  let c = d;
  let s = 0n;
  const nA = N_COINS * A;
  let _x = 0n;
  // sum` - is sum of all pool values apart from the
  // the swap out token's pool value.
  // prod` - is the product of all pool values apart
  // from the swap out token's poolValue.
  // s = sum`
  // c=(D^(n+1))/(n^n)*prod`
  for (let i = 0; i < N_COINS; i++) {
    if (i === tokenIndexFrom) {
      _x = x;
    } else if (i !== tokenIndexTo) {
      _x = poolValues[i];
    } else {
      continue;
    }
    s = s + _x;
    c = (c * d) / (_x * Nat(N_COINS));
  }
  // c = ([(D^(n+1))/(n^n)*prod`]*d)/(A(n^n))
  c = (c * d) / Nat(nA * N_COINS);
  // b = s/(D*An)
  const b = s + d / Nat(nA);
  let y_prev = 0n;
  let y = d;
  for (let i = 0; i < 1000; i++) {
    y_prev = y;
    // numerator = ((y^2)+([(D^(n+1))/(n^n)*prod`]*d)/(A(n^n)))
    // denominator = 2y+ (s/(D*An)) - D
    // y=  numerator/denominator
    y = (y * y + c) / (y * 2n + b - d);
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
 * @returns {{ outputValue: bigint}} outputValue - The amount to swap out and the price.
 *
 */

const calculateSwap = (dx, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const x = dx + poolValues[tokenIndexFrom];
  const y = getY(x, tokenIndexFrom, tokenIndexTo, poolValues);
  let dy = poolValues[tokenIndexTo] - y;
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
 * @param {number} centralTokenIndex - index of centeral token amount in poolAmounts array.
 * @param {Amount[]} poolAmounts - Array of Amounts of each token in the pool.Which is passed
 * from the function.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {Promise<{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount,Basis_Points:bigint}>}
 * returnValue - the input amount,the amout to be returned  and the price of at which exchanged.
 *
 */
export const getStableInputPrice = async (
  inputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  centralTokenIndex,
  poolAmounts,
  feeBasisPoints = 30n,
) => {
  let inputReserve = poolAmounts[tokenIndexFrom];
  let outputReserve = poolAmounts[tokenIndexTo];
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
  inputAmountAfterFeeCut = {
    brand: inputAmountAfterFeeCut.brand,
    value: inputAmountAfterFeeCut.value * BASIS_POINTS,
  };
  const basisRatio = makeRatio(BASIS_POINTS * 100n, inputAmount.brand);
  let inputAmountWithoutFeeCut = floorMultiplyBy(inputAmount, basisRatio);
  // Normalizing the poolValue according to Basis_Points
  let poolAmountsInBasisPoints = poolAmounts.map(amount => {
    return floorMultiplyBy(
      amount,
      makeRatio(BASIS_POINTS * 100n, amount.brand),
    );
  });
  let poolValues = poolAmountsInBasisPoints.map(amount => amount.value);

  let priceRatio;
  let outputAmount;
  if (
    tokenIndexFrom === centralTokenIndex ||
    tokenIndexTo === centralTokenIndex
  ) {
    let swapResult = calculateSwap(
      inputAmountAfterFeeCut.value,
      tokenIndexFrom,
      tokenIndexTo,
      poolValues,
    );
    outputAmount = AmountMath.make(
      poolAmounts[tokenIndexTo].brand,
      swapResult.outputValue,
    );
    priceRatio = makeRatioFromAmounts(outputAmount, inputAmountWithoutFeeCut);
    inputAmountWithoutFeeCut = {
      ...inputAmountWithoutFeeCut,
      value: inputAmountWithoutFeeCut.value / BASIS_POINTS,
    };
    outputAmount = {
      ...outputAmount,
      value: swapResult.outputValue / BASIS_POINTS,
    };
  } else {
    let firstSwapResult = calculateSwap(
      inputAmountAfterFeeCut.value,
      tokenIndexFrom,
      centralTokenIndex,
      poolValues,
    );

    poolValues = updatePoolValues(
      poolValues,
      tokenIndexFrom,
      inputAmountWithoutFeeCut.value,
      centralTokenIndex,
      firstSwapResult.outputValue,
    );
    let secondSwapResult = calculateSwap(
      firstSwapResult.outputValue,
      centralTokenIndex,
      tokenIndexTo,
      poolValues,
    );
    outputAmount = AmountMath.make(
      poolAmounts[tokenIndexTo].brand,
      secondSwapResult.outputValue,
    );
    priceRatio = makeRatioFromAmounts(outputAmount, inputAmountWithoutFeeCut);
    inputAmountWithoutFeeCut = {
      ...inputAmountWithoutFeeCut,
      value: inputAmountWithoutFeeCut.value / BASIS_POINTS,
    };
    outputAmount = {
      ...outputAmount,
      value: secondSwapResult.outputValue / BASIS_POINTS,
    };
  }
  return {
    priceRatio: priceRatio,
    inputAmount: inputAmountWithoutFeeCut,
    outputAmount: outputAmount,
    Basis_Points: BASIS_POINTS,
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
 * @param {number} centralTokenIndex - index of centeral token amount in poolAmounts array.
 * @param {Amount[]} poolAmounts - Array of amounts of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {Promise<{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount,Basis_Points:bigint}>}
 * returnValue - the input amount,the amout to be returned and the price of at which exchanged.
 */
export const getStableOutputPrice = async (
  outputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  centralTokenIndex,
  poolAmounts,
  feeBasisPoints = 30n,
) => {
  let initialpool = poolAmounts;
  let t = tokenIndexTo;
  tokenIndexTo = tokenIndexFrom;
  tokenIndexFrom = t;
  let inputReserve = poolAmounts[tokenIndexFrom];
  let outputReserve = poolAmounts[tokenIndexTo];
  assert(
    outputAmount.value > 0n,
    X`outputValue ${outputAmount.value} must be positive`,
  );
  assert(
    inputReserve.value > 0n,
    X`inputReserve ${inputReserve.value} must be positive`,
  );
  assert(
    outputReserve.value > 0n,
    X`outputReserve ${outputReserve.value} must be positive`,
  );
  const basisRatio = makeRatio(BASIS_POINTS * 100n, outputAmount.brand);
  let outputAmountBasis = floorMultiplyBy(outputAmount, basisRatio);
  // Normalizing the poolAmounts according to Basis_Points
  let poolAmountsInBasisPoints = poolAmounts.map(amount => {
    return floorMultiplyBy(
      amount,
      makeRatio(BASIS_POINTS * 100n, amount.brand),
    );
  });
  let poolValues = poolAmountsInBasisPoints.map(amount => amount.value);
  let priceRatio;
  let inputAmountAfterFeeCut;
  let inputAmount;
  if (
    tokenIndexFrom === centralTokenIndex ||
    tokenIndexTo === centralTokenIndex
  ) {
    let swapResult = calculateSwap(
      outputAmountBasis.value,
      tokenIndexFrom,
      tokenIndexTo,
      poolValues,
    );
    inputAmount = AmountMath.make(
      poolAmounts[tokenIndexTo].brand,
      swapResult.outputValue,
    );
  } else {
    let firstSwapResult = calculateSwap(
      outputAmountBasis.value,
      tokenIndexFrom,
      centralTokenIndex,
      poolValues,
    );
    poolValues = updatePoolValues(
      poolValues,
      tokenIndexTo,
      outputAmountBasis.value,
      centralTokenIndex,
      firstSwapResult.outputValue,
    );
    let secondSwapResult = calculateSwap(
      firstSwapResult.outputValue,
      centralTokenIndex,
      tokenIndexTo,
      poolValues,
    );
    inputAmount = AmountMath.make(
      poolAmounts[tokenIndexTo].brand,
      secondSwapResult.outputValue,
    );
  }
  const feeCutRatio = makeRatio(
    BASIS_POINTS - feeBasisPoints,
    inputAmount.brand,
    BASIS_POINTS,
    inputAmount.brand,
  );
  // Fee ratio multiplied by inputAmount to get inputAmount After fee cut
  inputAmountAfterFeeCut = floorDivideBy(inputAmount, feeCutRatio);
  priceRatio = makeRatioFromAmounts(outputAmountBasis, inputAmountAfterFeeCut);
  inputAmountAfterFeeCut = AmountMath.make(
    inputAmountAfterFeeCut.brand,
    inputAmountAfterFeeCut.value / BASIS_POINTS,
  );
  let result = await getStableInputPrice(
    inputAmountAfterFeeCut,
    tokenIndexTo,
    tokenIndexFrom,
    centralTokenIndex,
    initialpool,
  );
  while (result.outputAmount.value < outputAmount.value) {
    let incrementAmount = AmountMath.make(inputAmountAfterFeeCut.brand, 1n);
    inputAmountAfterFeeCut = AmountMath.add(
      inputAmountAfterFeeCut,
      incrementAmount,
    );
    result = await getStableInputPrice(
      inputAmountAfterFeeCut,
      tokenIndexTo,
      tokenIndexFrom,
      centralTokenIndex,
      initialpool,
    );
  }
  priceRatio = makeRatioFromAmounts(
    result.priceRatio.numerator,
    result.priceRatio.denominator,
  );
  return {
    priceRatio: priceRatio,
    inputAmount: inputAmountAfterFeeCut,
    outputAmount: outputAmount,
    Basis_Points: BASIS_POINTS,
  };
};
