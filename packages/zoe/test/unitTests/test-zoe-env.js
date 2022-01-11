// @ts-check
/* global VatData */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

test('harden from SES is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  harden();
  t.pass();
});

test('(mock) makeKind from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  VatData.makeKind();
  t.pass();
});

test('(mock) makeVirtualScalarWeakMap from SwingSet is in the zoe contract environment', t => {
  // @ts-ignore testing existence of function only
  VatData.makeVirtualScalarWeakMap();
  t.pass();
});
