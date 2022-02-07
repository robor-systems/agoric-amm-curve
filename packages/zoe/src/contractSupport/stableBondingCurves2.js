// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide, power } = natSafeMath;

const A = 3000;
const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.
// const BASIS_POINTS = 1n; // TODO change to 10_000n once tooling copes.

/**
 * Calculations for constant product markets like Uniswap.
 * https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf
 */

/**
 * Computes the the next D.
 *
 * @param {bigint} d_init - index of liquidity of inputReserve
 * in the reserves array.
 * @param {bigint} d_prod - index of liquidity of outputReserve
 * in the reserves array.
 * @param {number} A - The amplification coefficient is used to
 * determine the slippage incurred when performing swaps.The lower
 * it is, the closer the invariant is to the constant product.
 * @param {bigint} sum_x - Sum of liquidities of assets in the pool.
 * @param {number} N_COINS - number of coins in the pool
 *
 * @returns {bigint} d - return the next value of D after changes
 * in pools liquidity
 *
 */
const compute_next_d = (A, d_init, d_prod, sum_x, N_COINS) => {
  let d;
  let ann = multiply(A, power(N_COINS, N_COINS));
  // leverage = ann * sum_x
  let leverage = multiply(sum_x, ann);
  // d_prod = d^(n+1)/n^n(prod_x)
  // d = ((ann * sum_x + d_prod * n_coins) * d_init) / ((ann - 1) * d_init + (n_coins + 1) * d_prod)
  let numerator = multiply(d_init, add(multiply(d_prod, N_COINS), leverage));
  let denominator = add(
    multiply(d_init, subtract(ann, 1)),
    multiply(add(N_COINS, 1), d_prod),
  );
  d = floorDivide(numerator, denominator);
  return d;
};

/**
 * Computes the Stable Swap invariant (D).
 *
 * @param {bigint} amount_a - index of liquidity of inputReserve
 * in the reserves array.
 * @param {bigint} amount_b - index of liquidity of outputReserve
 * in the reserves array.
 * @param {number} A - The amplification coefficient is used to
 * determine the slippage incurred when performing swaps.The lower
 * it is, the closer the invariant is to the constant product.
 * @param {number} N_COINS - number of coins in the pool
 * @returns {bigint} d - the current price, in value form

 */
const compute_d = (amount_a, amount_b, A, N_COINS) => {
  let sum_x = add(amount_a, amount_b);
  let amount_a_times_coins = multiply(amount_a, N_COINS);
  let amount_b_times_coins = multiply(amount_a, N_COINS);

  // Using Newton's method to approximate D
  let d_prev;
  let d = sum_x;
  for (let i = 0; i < 256; i++) {
    console.log('d:', d);
    d_prev = d;
    let d_prod = d;
    d_prod = floorDivide(multiply(d_prod, d), amount_a_times_coins);
    d_prod = floorDivide(multiply(d_prod, d), amount_b_times_coins);
    d = compute_next_d(A, d, d_prod, sum_x, N_COINS);
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
 * @param {number} A - The amplification coefficient is used to
 * determine the slippage incurred when performing swaps.The lower
 * it is, the closer the invariant is to the constant product.
 * @param {number} N_COINS - number of coins in the pool
 * @returns {bigint} y - the amount of swap out asset to be returned
 * in exchange for amount x of swap in asset.
 */

const compute_y = (x, d, A, N_COINS) => {
  console.log('x:', x);
  const nn = Math.pow(N_COINS, N_COINS);
  const ann = A * nn;
  // let ann = A * N_COINS; // A * n ** n
  // sum' = prod' = x
  // c =  D ** (n + 1) / (n ** (2 * n) * prod' * A)
  let c = floorDivide(multiply(d, d), multiply(x, N_COINS));
  c = floorDivide(multiply(c, d), multiply(ann, power(N_COINS, N_COINS)));
  // b = sum' - (A*n**n - 1) * D / (A * n**n)
  let b = add(floorDivide(d, ann), x);
  // Solve for y by approximating: y**2 + b*y = c
  let y_prev;
  let y = d;
  for (let i = 0; i < 256; i++) {
    y_prev = y;
    // y = (y * y + c) / (2 * y + b - d);
    let y_numerator = add(power(y, 2), c);
    let y_denominator = subtract(add(multiply(y, 2), b), d);
    y = floorDivide(y_numerator, y_denominator);
    console.log('Y:', y);
    if (y > y_prev) {
      if (y - y_prev <= 1) break;
    } else {
      if (y_prev - y <= 1) break;
    }
  }
  console.log('exit');
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

export const getInputPrice2 = (
  inputReserveIndex,
  outputReserveIndex,
  reserves,
  inputValue,
  feeBasisPoints = 30n,
) => {
  let number_of_coins = reserves.length;
  console.log('number_of_coins:', number_of_coins);
  inputValue = Nat(inputValue);
  let inputReserve = Nat(reserves[inputReserveIndex]);
  let outputReserve = Nat(reserves[outputReserveIndex]);
  console.log('inputReserve:', inputReserve);
  console.log('outputReserve:', outputReserve);
  // assert(inputValue > 0n, X`inputValue ${inputValue} must be positive`);
  // assert(inputReserve > 0n, X`inputReserve ${inputReserve} must be positive`);
  // assert(
  //   outputReserve > 0n,
  //   X`outputReserve ${outputReserve} must be positive`,
  // );
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
  let D = compute_d(inputReserve, outputReserve, A, number_of_coins);
  console.log('D:', D);
  let Y = compute_y(add(inputValue, inputReserve), D, A, number_of_coins);
  console.log('Y:', Y);
  console.log('Y:', outputReserve - Y);
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
