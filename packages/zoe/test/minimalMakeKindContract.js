/* global VatData */

const start = _zcf => {
  VatData.makeKind();
  VatData.makeVirtualScalarWeakMap();

  return harden({});
};
harden(start);
export { start };
