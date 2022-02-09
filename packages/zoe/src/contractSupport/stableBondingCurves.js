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
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power, ceilDivide } = natSafeMath;

let A = 85;

const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.

function within10(a, b) {
  if (a > b) {
    return a - b <= 10;
  }
  return b - a <= 10;
}

function revertConversion(value) {
  if (Number(value) / Number(BASIS_POINTS) > 0.5) {
    return floorDivide(value, BASIS_POINTS);
  } else {
    return floorDivide(value, BASIS_POINTS);
  }
}

/**
 * Computes the Stable Swap invariant (D).
 * @param {bigint[]} poolValues - Array of amounts of each asset.Which is
 * passed from the contract.
 * @returns {bigint} d - the current price, in value form

 */
const getD = poolValues => {
  let N_COINS = poolValues.length;
  let sum_x = 0n;
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
    for (let j = 0; j < N_COINS; j++) {
      dp = (dp * d) / multiply(poolValues[j], N_COINS);
    }
    d_prev = d;
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
  for (let i = 0; i < N_COINS; i++) {
    if (i === tokenIndexFrom) {
      _x = x;
    } else if (i !== tokenIndexTo) {
      _x = poolValues[i];
    } else {
      continue;
    }
    s = s + _x;
    c = (c * d) / multiply(_x, N_COINS);
  }
  c = floorDivide(c * d, nA * N_COINS);
  const b = s + floorDivide(d, nA);
  let y_prev = 0n;
  let y = d;
  for (let i = 0; i < 1000; i++) {
    y_prev = y;
    y = (y * y + c) / (multiply(y, 2) + b - d);
    if (within10(y, y_prev)) {
      return y;
    }
  }
  throw new Error('Approximation did not converge');
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
 * @param {number} tokenIndexFrom - index of amount of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of amount of outputReserve
 * in the reserves array.
 * @param {Amount[]} poolAmounts - Array of Amountsof each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount,Basis_Points:bigint}}
 * returnValue - the input amount,the amout to be returned  and the price of at which exchanged.
 *
 */

export const getStableInputPrice = (
  inputAmount,
  tokenIndexFrom,
  tokenIndexTo,
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
  // Fee ration calculation

  const feeCutRatio = makeRatio(
    BASIS_POINTS - feeBasisPoints,
    inputAmount.brand,
    BASIS_POINTS,
    inputAmount.brand,
  );
  // Fee ratio multiplied by inputAmount to get inputAmount After fee cut
  let inputAmountAfterFeeCut = floorMultiplyBy(inputAmount, feeCutRatio);
  inputAmountAfterFeeCut = {
    brand: inputAmountAfterFeeCut.brand,
    value: inputAmountAfterFeeCut.value * BASIS_POINTS,
  };
  let inputAmountWithoutFeeCut = AmountMath.make(
    inputAmount.brand,
    inputAmount.value * BASIS_POINTS,
  );
  // Normalizing the poolValue according to Basis_Points
  let poolAmountsInBasisPoints = poolAmounts.map(amount => {
    return { ...amount, value: amount.value * BASIS_POINTS };
  });
  let poolValues = poolAmountsInBasisPoints.map(amount => amount.value);
  let swapResult = calculateSwap(
    inputAmountAfterFeeCut.value,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  let outputAmount = AmountMath.make(
    poolAmounts[tokenIndexTo].brand,
    swapResult.outputValue,
  );
  let priceRatio = makeRatioFromAmounts(outputAmount, inputAmountWithoutFeeCut);
  inputAmountWithoutFeeCut = {
    ...inputAmountWithoutFeeCut,
    value: inputAmountWithoutFeeCut.value / BASIS_POINTS,
  };
  outputAmount = {
    ...outputAmount,
    value: swapResult.outputValue / BASIS_POINTS,
  };
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
 * @param {Amount[]} poolAmounts - Array of amounts of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {{priceRatio:Ratio,inputAmount:Amount,outputAmount:Amount,Basis_Points:bigint}}
 * returnValue - the input amount,the amout to be returned and the price of at which exchanged.
 */
export const getStableOutputPrice = (
  outputAmount,
  tokenIndexFrom,
  tokenIndexTo,
  poolAmounts,
  feeBasisPoints = 30n,
) => {
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
  let outputAmountBasis = AmountMath.make(
    outputAmount.brand,
    outputAmount.value * BASIS_POINTS,
  );
  // Normalizing the poolAmounts according to Basis_Points
  let poolAmountsInBasisPoints = poolAmounts.map(amount => {
    return { ...amount, value: amount.value * BASIS_POINTS };
  });
  let poolValues = poolAmountsInBasisPoints.map(amount => amount.value);
  let swapResult = calculateSwap(
    outputAmountBasis.value,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  let inputAmount = AmountMath.make(
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
  let inputAmountAfterFeeCut = floorDivideBy(inputAmount, feeCutRatio);
  let priceRatio = makeRatioFromAmounts(
    outputAmountBasis,
    inputAmountAfterFeeCut,
  );
  inputAmountAfterFeeCut = AmountMath.make(
    inputAmountAfterFeeCut.brand,
    inputAmountAfterFeeCut.value / BASIS_POINTS,
  );
  return {
    priceRatio: priceRatio,
    inputAmount: inputAmountAfterFeeCut,
    outputAmount: outputAmount,
    Basis_Points: BASIS_POINTS,
  };
};
