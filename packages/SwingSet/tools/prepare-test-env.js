/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * installs SES (and does lockdown), plus adds mocks
 * for virtual objects: makeKind, makeDurableKind, makeVirtualScalarWeakMap
 */

import '@agoric/install-ses/pre-bundle-source.js';

import './install-ses-debug.js';
import { makeFakeVirtualObjectManager } from './fakeVirtualSupport.js';

const {
  makeVirtualScalarWeakMap,
  makeKind,
  makeDurableKind,
} = makeFakeVirtualObjectManager({ cacheSize: 3 });

const VatData = harden({
  makeVirtualScalarWeakMap,
  makeKind,
  makeDurableKind,
});

globalThis.VatData = VatData;
