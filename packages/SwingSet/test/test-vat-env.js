/* global VatData */
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@agoric/marshal';

test('harden from SES is in the vat environment', t => {
  harden();
  t.pass();
});

function makeThingInstance(_state) {
  return {
    self: Far('thing', {
      ping() {
        return 4;
      },
    }),
  };
}

test('kind makers are in the vat environment', t => {
  // TODO: configure eslint to know that VatData is a global
  // eslint-disable-next-line no-undef
  const vthingMaker = VatData.makeKind(makeThingInstance);
  const vthing = vthingMaker('vthing');
  t.is(vthing.ping(), 4);

  const dthingMaker = VatData.makeDurableKind(makeThingInstance);
  const dthing = dthingMaker('dthing');
  t.is(dthing.ping(), 4);
});

test('store makers are in the vat environment', t => {
  // TODO: configure eslint to know that VatData is a global
  // eslint-disable-next-line no-undef
  const o = harden({ size: 10, color: 'blue' });

  const m = VatData.makeScalarBigMapStore();
  m.init('key', o);
  t.deepEqual(m.get('key'), o);

  const wm = VatData.makeScalarWeakBigMapStore();
  wm.init('key', o);
  t.deepEqual(wm.get('key'), o);

  const s = VatData.makeScalarBigSetStore();
  s.add('key');
  t.truthy(s.has('key'));

  const ws = VatData.makeScalarWeakBigSetStore();
  ws.add('key');
  t.truthy(ws.has('key'));
});
