// Copyright (C) 2019 Agoric, under Apache license 2.0

// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { passStyleOf } from '@agoric/marshal';
import { mustBeComparable } from '../../same-structure';

const assertKey = key => {
  harden(key); // TODO: Just a transition kludge. Remove when possible.
  mustBeComparable(key);
  const passStyle = passStyleOf(key);
  switch (passStyle) {
    case 'bigint':
    case 'boolean':
    case 'null':
    case 'number':
    case 'string':
    case 'symbol':
    case 'undefined':
    case 'remotable': {
      return;
    }
    case 'copyArray':
    case 'copyRecord':
    case 'copyError': {
      assert.fail(X`composite keys not yet allowed: ${key}`);
    }
    // case 'promise': is precluded by `mustBeComparable` above
    default: {
      assert.fail(X`unexpected passStyle ${passStyle}`);
    }
  }
};

const assertValue = value => {
  harden(value); // TODO: Just a transition kludge. Remove when possible.
  passStyleOf(value); // asserts that value is passable
};

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 *
 * @template K,V
 * @param {string} [keyName='key'] - the column name for the key
 * @param {Partial<StoreOptions>=} _options
 * @returns {StoreMap<K,V>}
 */
export const makeScalarMap = (keyName = 'key', _options = {}) => {
  const m = new Map();
  const assertKeyDoesNotExist = key =>
    assert(!m.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(m.has(key), X`${q(keyName)} not found: ${key}`);
  const scalarMap = {
    has: key => {
      // .has is very accepting
      return m.has(key);
    },
    init: (key, value) => {
      assertKey(key);
      assertValue(value);
      assertKeyDoesNotExist(key);
      m.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return m.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value);
      m.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      m.delete(key);
    },
    keys: () => Array.from(m.keys()),
    values: () => Array.from(m.values()),
    entries: () => Array.from(m.entries()),
  };
  return harden(scalarMap);
};
harden(makeScalarMap);
