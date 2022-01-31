import { assert, details as X } from '@agoric/assert';
import { makeMarshal, Far } from '@agoric/marshal';
import { parseVatSlot } from './parseVatSlots.js';

// raw devices can use this to build a set of convenience tools for
// serialization/unserialization

export function buildSerializationTools(syscall, deviceName) {
  // TODO: prevent our Presence/DeviceNode objects from being accidentally be
  // marshal-serialized into persistent state

  const presences = new WeakMap();
  const myDeviceNodes = new WeakMap();

  function slotFromPresence(p) {
    return presences.get(p);
  }
  function presenceForSlot(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    assert.equal(type, 'object');
    assert.equal(allocatedByVat, false);
    const p = Far('presence', {
      send(method, args) {
        assert.typeof(method, 'string');
        assert(Array.isArray(args), args);
        // eslint-disable-next-line no-use-before-define
        const capdata = serialize(args);
        syscall.sendOnly(slot, method, capdata);
      },
    });
    presences.set(p, slot);
    return p;
  }

  function slotFromMyDeviceNode(dn) {
    return myDeviceNodes.get(dn);
  }
  function deviceNodeForSlot(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    assert.equal(type, 'device');
    assert.equal(allocatedByVat, true);
    const dn = Far('device node', {});
    myDeviceNodes.set(dn, slot);
    return dn;
  }

  function convertSlotToVal(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    if (type === 'object') {
      assert(!allocatedByVat, X`devices cannot yet allocate objects ${slot}`);
      return presenceForSlot(slot);
    } else if (type === 'device') {
      assert(
        allocatedByVat,
        X`devices should yet not be given other devices '${slot}'`,
      );
      return deviceNodeForSlot(slot);
    } else if (type === 'promise') {
      assert.fail(X`devices should not yet be given promises '${slot}'`);
    } else {
      assert.fail(X`unrecognized slot type '${type}'`);
    }
  }

  function convertValToSlot(val) {
    const objSlot = slotFromPresence(val);
    if (objSlot) {
      return objSlot;
    }
    const devnodeSlot = slotFromMyDeviceNode(val);
    if (devnodeSlot) {
      return devnodeSlot;
    }
    throw Error(X`unable to convert value ${val}`);
  }

  const m = makeMarshal(convertValToSlot, convertSlotToVal, {
    marshalName: `device:${deviceName}`,
    // TODO Temporary hack.
    // See https://github.com/Agoric/agoric-sdk/issues/2780
    errorIdNum: 60000,
  });

  // for invoke(), these will unserialize the arguments, and serialize the
  // response (into a vatresult with the 'ok' header)
  const unserialize = capdata => m.unserialize(capdata);
  const serialize = data => m.serialize(harden(data));
  const returnFromInvoke = args => harden(['ok', serialize(args)]);

  const tools = {
    slotFromPresence,
    presenceForSlot,
    slotFromMyDeviceNode,
    deviceNodeForSlot,
    unserialize,
    returnFromInvoke,
  };

  return harden(tools);
}
harden(buildSerializationTools);
