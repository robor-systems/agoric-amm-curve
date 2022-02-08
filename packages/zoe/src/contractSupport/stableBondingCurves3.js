// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power } = natSafeMath;

let __A = 85;
let A_PRECISION = 100;
let A = __A * A_PRECISION;
const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.
// const BASIS_POINTS = 1n; // TODO change to 10_000n once tooling copes.

function within10(a, b) {
  if (a > b) {
    return a - b <= 10;
  }
  return b - a <= 10;
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
    console.log('dp:', dp);
    d_prev = d;
    d =
      (((Nat(nA) * sum_x) / Nat(A_PRECISION) + dp * Nat(N_COINS)) * d) /
      (((Nat(nA) - Nat(A_PRECISION)) * Nat(d)) / Nat(A_PRECISION) +
        Nat(N_COINS + 1) * dp);
    console.log('d:', d);
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
  console.log('d:', d);
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
  c = floorDivide(multiply(c * d, A_PRECISION), nA * N_COINS);
  const b = s + floorDivide(multiply(d, A_PRECISION), nA);
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
 * @returns {NatValue} outputValue - the current price, in value form
 *
 */

export const getInputPrice3 = (
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
  console.log(inputValueAfterFee, tokenIndexFrom, tokenIndexTo, poolValues);
  let output = calculateSwap(
    inputValueAfterFee,
    tokenIndexFrom,
    tokenIndexTo,
    poolValues,
  );
  console.log({ inputValue: inputValueAfterFee, ...output });
  return 0n;
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
 * @param {any} inputReserve - the value in the liquidity
 * pool of the asset being spent
 * @param {any} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {NatValue} inputValue - the value of input required to purchase output
 */
export const getOutputPrice = (
  outputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30n,
) => {
  outputValue = Nat(outputValue);
  inputReserve = Nat(inputReserve);
  outputReserve = Nat(outputReserve);

  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  assert(
    outputReserve > outputValue,
    X`outputReserve ${outputReserve} must be greater than outputValue ${outputValue}`,
  );

  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  const numerator = multiply(multiply(outputValue, inputReserve), BASIS_POINTS);
  const denominator = multiply(
    subtract(outputReserve, outputValue),
    oneMinusFeeScaled,
  );
  return add(floorDivide(numerator, denominator), 1n);
};

// Calculate how many liquidity tokens we should be minting to send back to the
// user when adding liquidity. We provide new liquidity equal to the existing
// liquidity multiplied by the ratio of new central tokens to central tokens
// already held. If the current supply is zero, return the inputValue as the
// initial liquidity to mint is arbitrary.
/**
 *
 * @param {bigint} liqTokenSupply
 * @param {bigint} inputValue
 * @param {bigint} inputReserve
 * @returns {NatValue}
 */
export const calcLiqValueToMint = (
  liqTokenSupply,
  inputValue,
  inputReserve,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  inputValue = Nat(inputValue);
  inputReserve = Nat(inputReserve);

  if (liqTokenSupply === 0n) {
    return inputValue;
  }
  return floorDivide(multiply(inputValue, liqTokenSupply), inputReserve);
};

/**
 * Calculate how much of the secondary token is required from the user when
 * adding liquidity. We require that the deposited ratio of central to secondary
 * match the current ratio of holdings in the pool.
 *
 * @param {any} centralIn - The value of central assets being deposited
 * @param {any} centralPool - The value of central assets in the pool
 * @param {any} secondaryPool - The value of secondary assets in the pool
 * @param {any} secondaryIn - The value of secondary assets provided. If
 * the pool is empty, the entire amount will be accepted
 * @returns {NatValue} - the amount of secondary required
 */
export const calcSecondaryRequired = (
  centralIn,
  centralPool,
  secondaryPool,
  secondaryIn,
) => {
  centralIn = Nat(centralIn);
  centralPool = Nat(centralPool);
  secondaryPool = Nat(secondaryPool);
  secondaryIn = Nat(secondaryIn);

  if (centralPool === 0n || secondaryPool === 0n) {
    return secondaryIn;
  }

  const scaledSecondary = floorDivide(
    multiply(centralIn, secondaryPool),
    centralPool,
  );
  const exact =
    multiply(centralIn, secondaryPool) ===
    multiply(scaledSecondary, centralPool);

  // doesn't match the x-y-k.pdf paper, but more correct. When the ratios are
  // exactly equal, lPrime is exactly l * (1 + alpha) and adding one is wrong
  return exact ? scaledSecondary : 1n + scaledSecondary;
};

// Calculate how many underlying tokens (in the form of a value) should be
// returned when removing liquidity.
export const calcValueToRemove = (
  liqTokenSupply,
  poolValue,
  liquidityValueIn,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  liquidityValueIn = Nat(liquidityValueIn);
  poolValue = Nat(poolValue);

  return floorDivide(multiply(liquidityValueIn, poolValue), liqTokenSupply);
};
