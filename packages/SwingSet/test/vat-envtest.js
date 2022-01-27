/* global VatData */
import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;

  return Far('root', {
    bootstrap(_vats) {
      log(`control sample: ${typeof notThere}`);
      log(`harden: ${typeof harden}`);
      log(`VatData: ${typeof VatData}`);
      for (const prop of Object.keys(VatData)) {
        log(`VatData.${prop}: ${typeof VatData[prop]}`);
      }
    },
  });
}
