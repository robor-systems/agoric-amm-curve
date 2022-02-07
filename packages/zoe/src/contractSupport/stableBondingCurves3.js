// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power } = natSafeMath;

let __A = 85;
let A_PRECISION = 100;
let A = __A * A_PRECISION;
const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.
const BASIS_POINTS2 = 100000n; // TODO change to 10_000n once tooling copes.
// const BASIS_POINTS = 1n; // TODO change to 10_000n once tooling copes.

/**
 * Computes the Stable Swap invariant (D).
 * @param {number} N_COINS - number of coins in the pool
 * @param {[bigint]} reserves - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @returns {bigint} d - the current price, in value form

 */
const compute_d = (N_COINS, reserves) => {
  let sum_x = 0n;
  for (let i = 0; i < N_COINS; i++) {
    sum_x = sum_x + reserves[i];
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
      dp = (dp * d) / multiply(reserves[j], N_COINS);
    }
    d_prev = d;
    d =
      ((floorDivide(multiply(nA, sum_x), A_PRECISION) + add(dp, N_COINS)) * d) /
      add(
        floorDivide(subtract(nA, A_PRECISION) * d, A_PRECISION),
        multiply(add(N_COINS, 1), dp),
      );
    if (d > d_prev) {
      if (d - d_prev <= 1) break;
    } else {
      if (d_prev - d <= 1) break;
    }
  }
  return d;
};

/**
 * Compute the swap amount `y` in proportion to `x`.
 *
 * @param {bigint} x - index of liquidity of inputReserve
 * in the reserves array.
 * @param {bigint} d - index of liquidity of outputReserve
 * in the reserves array.
 * @param {number} N_COINS - number of coins in the pool
 * @returns {bigint} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */

const compute_y = (x, d, N_COINS, reserves, tokenIndexFrom, tokenIndexTo) => {
  console.log(x, d, N_COINS, reserves, tokenIndexFrom, tokenIndexTo);
  let c = d;
  let s = 0n;
  const nA = N_COINS * A;
  let _x = 0n;
  for (let i = 0; i < N_COINS; i++) {
    if (i === tokenIndexFrom) {
      _x = x;
    } else if (i !== tokenIndexTo) {
      _x = reserves[i];
    } else {
      continue;
    }
    s = s + _x;
    c = (c * d) / multiply(_x, N_COINS);
  }
  console.log('x:', x);
  console.log('_x:', _x);
  console.log('c:', c);
  console.log('d:', d);
  console.log('multiply(c * d):', multiply(c, d));
  console.log('nA * N_COINS:', nA * N_COINS);
  c = floorDivide(multiply(c * d, A_PRECISION), nA * N_COINS);
  console.log('done');
  const b = s + floorDivide(multiply(d, A_PRECISION), nA);
  let y_prev = 0n;
  let y = d;
  for (let i = 0; i < 1000; i++) {
    y_prev = y;
    y = (y * y + c) / (multiply(y, 2) + b - d);
    if (y > y_prev) {
      if (y - y_prev <= 1) break;
    } else {
      if (y_prev - y <= 1) break;
    }
  }
  return y;
};

/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {any} inputValue - the value of the asset sent
 * in to be swapped.
 * @param {number} inputReserveIndex - index of liquidity of inputReserve
 * in the reserves array.
 * @param {number} outputReserveIndex - index of liquidity of outputReserve
 * in the reserves array.
 * @param {[bigint]} reserves - Array of liquidities of each asset.Which is
 * passed from the contract.
 * @param {bigint} [feeBasisPoints=30n] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {NatValue} outputValue - the current price, in value form
 *
 */

export const getInputPrice3 = (
  inputReserveIndex,
  outputReserveIndex,
  reserves,
  inputValue,
  feeBasisPoints = 40n,
) => {
  let number_of_coins = reserves.length;
  console.log('number_of_coins:', number_of_coins);
  inputValue = Nat(inputValue);
  let inputReserve = Nat(reserves[inputReserveIndex]);
  let outputReserve = Nat(reserves[outputReserveIndex]);
  console.log('inputReserve:', inputReserve);
  console.log('outputReserve:', outputReserve);
  assert(inputValue > 0n, X`inputValue ${inputValue} must be positive`);
  assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  assert(
    outputReserve > 0n,
    X`outputReserve ${outputReserve} must be positive`,
  );
  let sum_x = reserves.reduce((partialSum, x) => partialSum + x, 0n);
  let product_x = reserves.reduce(
    (partialProduct, x) => partialProduct * x,
    1n,
  );
  const nn = Math.pow(number_of_coins, number_of_coins);
  const Ann = A * nn;
  console.log('Ann:', Ann);
  console.log('Sum:', sum_x);
  console.log('product:', product_x);
  let D = compute_d(number_of_coins, reserves);
  console.log('D:', D);
  let Y = compute_y(
    add(inputValue, inputReserve),
    D,
    number_of_coins,
    reserves,
    inputReserveIndex,
    outputReserveIndex,
  );
  console.log('Y Reserve:', Y);
  console.log('Y:', outputReserve - Y);
  Y = outputReserve - Y;
  let fee = (Y / BASIS_POINTS) * feeBasisPoints;
  Y = Y - fee;
  console.log('after fee:', Y);
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
