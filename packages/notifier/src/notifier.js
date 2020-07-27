// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { producePromise } from '@agoric/produce-promise';
// eslint-disable-next-line import/no-cycle
import { makeAsyncIterableFromNotifier } from './asyncIterableAdaptor';

/**
 * @typedef {number | undefined} UpdateCount a value used to mark the position
 * in the update stream. For the last state, the updateCount is undefined.
 */

/**
 * @template T the type of the state value
 * @typedef {Object} UpdateRecord<T>
 * @property {T} value is whatever state the service wants to publish
 * @property {UpdateCount} updateCount is a value that identifies the update
 */

/**
 * @template T the type of the notifier state
 * @callback GetUpdateSince<T> Can be called repeatedly to get a sequence of
 * update records
 * @param {UpdateCount} [updateCount] return update record as of a handle
 * If the handle argument is omitted or differs from the current handle,
 * return the current record.
 * Otherwise, after the next state change, the promise will resolve to the
 * then-current value of the record.
 * @returns {Promise<UpdateRecord<T>>} resolves to the corresponding update
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} Notifier<T> an object that can be used to get the current
 * state or updates
 * @property {GetUpdateSince<T>} getUpdateSince return update record as of a
 * handle
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} Updater<T> an object that should be closely held, as
 * anyone with access to
 * it can provide updates
 * @property {(state: T) => void} updateState sets the new state, and resolves
 * the outstanding promise to send an update
 * @property {(finalState: T) => void} finish sets the final state, sends a
 * final update, and freezes the
 * updater
 * @property {(reason: T) => void} reject the stream becomes erroneously
 * terminated, allegedly for the stated reason.
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} NotifierRecord<T> the produced notifier/updater pair
 * @property {Notifier<T>} notifier the (widely-held) notifier consumer
 * @property {Updater<T>} updater the (closely-held) notifier producer
 */

/**
 * Produces a pair of objects, which allow a service to produce a stream of
 * update promises.
 *
 * @template T the type of the notifier state
 * @param {T} [initialState] the first state to be returned
 * @returns {NotifierRecord<T>} the notifier and updater
 */
// The initial state argument has to be truly optional even though it can
// be any first class value including `undefined`. We need to distinguish the
// presence vs the absence of it, which we cannot do with the optional argument
// syntax. Rather we use the arity of the arguments array.
//
// If no initial state is provided to `makeNotifierKit`, then it starts without
// an initial state. Its initial state will instead be the state of the first
// update.
export const makeNotifierKit = (...args) => {
  let nextPromiseKit = producePromise();
  let currentUpdateCount = 1; // avoid falsy numbers
  let currentResponse;

  const hasState = () => currentResponse !== undefined;

  const final = () => currentUpdateCount === undefined;

  const baseNotifier = harden({
    // NaN matches nothing
    getUpdateSince(updateCount = NaN) {
      if (
        hasState() &&
        (final() || currentResponse.updateCount !== updateCount)
      ) {
        // If hasState() and either it is final() or it is
        // not the state of updateCount, return the current state.
        return Promise.resolve(currentResponse);
      }
      // otherwise return a promise for the next state.
      return nextPromiseKit.promise;
    },
  });

  const asyncIterable = makeAsyncIterableFromNotifier(baseNotifier);

  const notifier = harden({
    ...baseNotifier,
    ...asyncIterable,
  });

  const updater = harden({
    updateState(state) {
      if (final()) {
        throw new Error('Cannot update state after termination.');
      }

      // become hasState() && !final()
      currentUpdateCount += 1;
      currentResponse = harden({
        value: state,
        updateCount: currentUpdateCount,
      });
      nextPromiseKit.resolve(currentResponse);
      nextPromiseKit = producePromise();
    },

    finish(finalState) {
      if (final()) {
        throw new Error('Cannot finish after termination.');
      }

      // become hasState() && final()
      currentUpdateCount = undefined;
      currentResponse = harden({
        value: finalState,
        updateCount: currentUpdateCount,
      });
      nextPromiseKit.resolve(currentResponse);
      nextPromiseKit = undefined;
    },

    reject(reason) {
      if (final()) {
        throw new Error('Cannot reject after termination.');
      }

      // become !hasState() && final()
      currentUpdateCount = undefined;
      currentResponse = undefined;
      nextPromiseKit.reject(reason);
    },
  });

  if (args.length >= 1) {
    updater.updateState(args[0]);
  }

  // notifier facet is separate so it can be handed out loosely while updater
  // is tightly held
  return harden({ notifier, updater });
};
