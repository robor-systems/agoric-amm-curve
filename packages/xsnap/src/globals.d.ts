declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;

namespace global {
  declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;
}

interface VatData {
  makeKind: function;
  makeDurableKind: function;
  makeScalarBigMapStore: function;
  makeScalarWeakBigMapStore: function;
  makeScalarBigSetStore: function;
  makeScalarWeakBigSetStore: function;
}

declare let VatData: VatData;
