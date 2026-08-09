module.exports = function (options) {
  return {
    ...options,
    externals: {
      // Prisma has native binaries — must stay in node_modules, not bundled
      '@prisma/client': 'commonjs @prisma/client',
      prisma: 'commonjs prisma',
      // @napi-rs/canvas ships platform-specific .node binaries; webpack can't
      // parse them. Keep it external so it resolves from node_modules at runtime
      // (the same pattern as Prisma). Only loaded by the optional cross-check path.
      '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
      // pdfjs-dist is large and ESM; resolve at runtime, don't bundle.
      'pdfjs-dist/legacy/build/pdf.mjs': 'commonjs pdfjs-dist/legacy/build/pdf.mjs',
    },
  }
}
