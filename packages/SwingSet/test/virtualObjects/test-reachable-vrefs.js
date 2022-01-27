import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far, Remotable } from '@agoric/marshal';

import { makeVatSlot } from '../../src/parseVatSlots.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

// empty object, used as weap map store key
function makeKeyInstance(_state) {
  return {
    init() {},
    self: Far('key'),
  };
}

function makeHolderInstance(state) {
  return {
    init(held) {
      state.held = held;
    },
    self: Far('holder', {
      setHeld(held) {
        state.held = held;
      },
      getHeld() {
        return state.held;
      },
    }),
  };
}

test('VOM tracks reachable vrefs', async t => {
  const vomOptions = { cacheSize: 3 };
  const { vom, vrm, cm } = makeFakeVirtualStuff(vomOptions);
  const { makeKind } = vom;
  const { makeScalarWeakBigMapStore } = cm;
  const weakStore = makeScalarWeakBigMapStore('test');
  const keyMaker = makeKind(makeKeyInstance);
  const holderMaker = makeKind(makeHolderInstance);

  let count = 1001;
  function makePresence() {
    // Both Remotable() and the Far() convenience wrapper mark things as
    // pass-by-reference. They are used when creating an (imported) Presence,
    // not just an (exported) "Remotable".
    const pres = Remotable(`Alleged: presence-${count}`, undefined, {});
    const vref = makeVatSlot('object', false, count);
    vom.registerEntry(vref, pres);
    count += 1;
    return [vref, pres];
  }

  const [vref1, obj1] = makePresence();
  const key1 = keyMaker();
  t.falsy(vrm.isPresenceReachable(vref1));
  weakStore.init(key1, obj1);
  t.truthy(vrm.isPresenceReachable(vref1));

  const [vref2, obj2] = makePresence();
  const key2 = keyMaker();
  weakStore.init(key2, 'not yet');
  t.falsy(vrm.isPresenceReachable(vref2));
  weakStore.set(key2, obj2);
  t.truthy(vrm.isPresenceReachable(vref2));

  // now check that Presences are tracked when in the state of a virtual
  // object
  const [vref3, obj3] = makePresence();
  t.falsy(vrm.isPresenceReachable(vref3));
  // eslint-disable-next-line no-unused-vars
  const holder3 = holderMaker(obj3);
  t.truthy(vrm.isPresenceReachable(vref3));

  const [vref4, obj4] = makePresence();
  const holder4 = holderMaker('not yet');
  t.falsy(vrm.isPresenceReachable(vref4));
  holder4.setHeld(obj4);
  t.truthy(vrm.isPresenceReachable(vref4));
});
