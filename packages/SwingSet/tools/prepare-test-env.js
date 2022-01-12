/* global globalThis */
/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 */

import '@agoric/install-ses/pre-bundle-source.js';

import './install-ses-debug.js';
import { makeFakeVirtualStuff } from './fakeVirtualSupport.js';

const { vom, cm } = makeFakeVirtualStuff({ cacheSize: 3 });

const { makeKind, makeDurableKind } = vom;

const {
  makeScalarBigMapStore,
  makeScalarWeakBigMapStore,
  makeScalarBigSetStore,
  makeScalarWeakBigSetStore,
} = cm;

const VatData = harden({
  makeKind,
  makeDurableKind,
  makeScalarBigMapStore,
  makeScalarWeakBigMapStore,
  makeScalarBigSetStore,
  makeScalarWeakBigSetStore,
});

globalThis.VatData = VatData;
