/* global VatData */

const start = _zcf => {
  VatData.makeKind();
  VatData.makeDurableKind();
  VatData.makeScalarBigMapStore();
  VatData.makeScalarWeakBigMapStore();
  VatData.makeScalarBigSetStore();
  VatData.makeScalarWeakBigSetStore();

  return harden({});
};
harden(start);
export { start };
