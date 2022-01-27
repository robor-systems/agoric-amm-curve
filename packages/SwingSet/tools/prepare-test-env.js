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
  makeKind,
  makeDurableKind,
  makeVirtualScalarWeakMap,
} = makeFakeVirtualObjectManager({ cacheSize: 3 });

globalThis.makeKind = makeKind;
globalThis.makeDurableKind = makeDurableKind;
globalThis.makeVirtualScalarWeakMap = makeVirtualScalarWeakMap;
