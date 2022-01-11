declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;

namespace global {
  declare var issueCommand: (msg: ArrayBuffer) => ArrayBuffer;
}

interface VatData {
  makeKind: function;
  makeVirtualScalarWeakMap: function;
}

declare let VatData: VatData;
