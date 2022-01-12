interface VatData {
  makeKind: function;
  makeDurableKind: function;
  makeScalarBigMapStore: function;
  makeScalarWeakBigMapStore: function;
  makeScalarBigSetStore: function;
  makeScalarWeakBigSetStore: function;
}

declare let VatData: VatData;
