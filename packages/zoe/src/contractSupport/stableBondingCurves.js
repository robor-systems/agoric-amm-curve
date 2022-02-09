// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power, ceilDivide } = natSafeMath;

let A = 85;

const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.
// const BASIS_POINTS = 1n; // TODO change to 10_000n once tooling copes.

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
 * @param {bigint[]} poolValues - Array of liquidities of each asset.Which is
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
 * @param {bigint} x - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexFrom - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of liquidity of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of liquidities of each asset.Which is
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
 * @param {number} tokenIndexFrom - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of liquidity of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @returns {{ outputValue: bigint, price:number}} outputValue - The amount to swap out and the price.
 *
 */

const calculateSwap = (dx, tokenIndexFrom, tokenIndexTo, poolValues) => {
  const x = Nat(dx) + poolValues[tokenIndexFrom];
  const y = getY(x, tokenIndexFrom, tokenIndexTo, poolValues);
  let dy = poolValues[tokenIndexTo] - y;
  let price = Number(dy) / Number(dx);
  return { outputValue: dy, price: price };
};

/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {number} inputValue - the value of the asset sent
 * in to be swapped.
 * @param {number} tokenIndexFrom - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of liquidity of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {{price:number,inputValue:bigint,outputValue:bigint}}
 * returnValue - the input amount,the amout to be returned  and the price of at which exchanged.
 *
 */

export const getStableInputPrice = (
  inputValue,
  tokenIndexFrom,
  tokenIndexTo,
  poolValues,
  feeBasisPoints = 30n,
) => {
  let input = Nat(inputValue);
  let inputReserve = Nat(poolValues[tokenIndexFrom]);
  let outputReserve = Nat(poolValues[tokenIndexTo]);
  assert(input > 0n, X`inputValue ${input} must be positive`);
  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  // Normalizing the inputValue according to Basis_Points
  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  // Subtracting fee from Input Value
  let inputValueAfterFee = multiply(input, oneMinusFeeScaled);
  // Normalizing the poolValue according to Basis_Points
  poolValues = poolValues.map(value => value * BASIS_POINTS);
  let output = calculateSwap(
    inputValueAfterFee,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  // let convertedInputValue = revertConversion(inputValueAfterFee);
  let convertedOutputValue = floorDivide(output.outputValue, BASIS_POINTS);

  let price = Number(convertedOutputValue) / Number(input);
  return {
    price: Number(price),
    // convertedPrice: convertedOutputValue / input,
    inputValue: input,
    outputValue: convertedOutputValue,
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
 * @param {any} outputValue - the value of the asset the user wants
 * to get
 * @param {number} tokenIndexFrom - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} tokenIndexTo - index of liquidity of outputReserve
 * in the reserves array.
 * @param {bigint[]} poolValues - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {{inputValue:bigint,outputValue:bigint,price:number}} returnValue -
 * the input amount,the amout to be returned and the price of at which exchanged.
 */
export const getStableOutputPrice = (
  outputValue,
  tokenIndexFrom,
  tokenIndexTo,
  poolValues,
  feeBasisPoints = 30n,
) => {
  let temp = tokenIndexTo;
  tokenIndexTo = tokenIndexFrom;
  tokenIndexFrom = temp;
  let outputVal = Nat(outputValue);
  let inputReserve = Nat(poolValues[tokenIndexFrom]);
  let outputReserve = Nat(poolValues[tokenIndexTo]);
  assert(outputVal > 0n, X`ouputValue ${outputVal} must be positive`);
  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  // Normalizing the inputValue according to Basis_Points
  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  poolValues = poolValues.map(value => value * BASIS_POINTS);
  let output = calculateSwap(
    outputVal * BASIS_POINTS,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  let inputVal = output.outputValue / oneMinusFeeScaled;
  let price = inputVal === 0n ? 0 : Number(outputVal) / Number(inputVal);
  let convertedPrice = inputVal === 0n ? 0n : outputVal / inputVal;
  return {
    price: price,
    // convertedPrice: convertedPrice,
    inputValue: inputVal,
    outputValue: outputVal,
  };
};
