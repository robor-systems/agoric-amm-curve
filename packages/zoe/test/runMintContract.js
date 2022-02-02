// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

/** @type {ContractStartFn} */
const start = async (zcf, privateArgs) => {
  const runMint = await zcf.registerFeeMint('RUN', privateArgs.feeMintAccess);

  const run10 = AmountMath.make(runMint.getIssuerRecord().brand, 10n);

  const creatorFacet = Far('creatorFacet', {
    mintRun: () => {
      const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
      runMint.mintGains(harden({ RUN: run10 }), zcfSeat);
      zcfSeat.exit();
      return E(userSeat).getPayout('RUN');
    },
  });
  return harden({ creatorFacet });
};
harden(start);
export { start };
