// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { setup } from '../setupBasicMints.js';
import fakeVatAdmin from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/useObjExample.js`;

test('zoe - useObj', async t => {
  t.plan(3);
  const { moolaIssuer, moolaMint, moola } = setup();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await E(zoe).install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3n));

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
  });
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );

  const invitation = E(publicFacet).makeInvitation();

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Pixels: moola(3n) },
  });
  const alicePayments = { Pixels: aliceMoolaPayment };

  // Alice makes an offer
  const aliceSeat = await E(zoe).offer(
    invitation,
    aliceProposal,
    alicePayments,
  );

  const useObj = await E(aliceSeat).getOfferResult();

  t.is(
    useObj.colorPixels('purple'),
    `successfully colored 3 pixels purple`,
    `use of use object works`,
  );

  aliceSeat.tryExit();

  const aliceMoolaPayoutPayment = await E(aliceSeat).getPayout('Pixels');

  t.deepEqual(
    await moolaIssuer.getAmountOf(aliceMoolaPayoutPayment),
    moola(3n),
    `alice gets everything she escrowed back`,
  );

  t.throws(
    () => useObj.colorPixels('purple'),
    { message: /the escrowing offer is no longer active/ },
    `use of use object fails once offer is withdrawn or amounts are reallocated`,
  );
});
