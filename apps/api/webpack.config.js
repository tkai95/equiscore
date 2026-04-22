module.exports = function (options) {
  return {
    ...options,
    externals: {
      // Prisma has native binaries — must stay in node_modules, not bundled
      '@prisma/client': 'commonjs @prisma/client',
      prisma: 'commonjs prisma',
    },
  }
}
