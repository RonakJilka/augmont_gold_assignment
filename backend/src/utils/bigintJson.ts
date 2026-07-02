// Patch BigInt so JSON.stringify emits string values instead of throwing.
// Import once at each process entry point.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export {};
