module.exports = function (api) {
  api.cache(true);
  // Resolve from this app so monorepo hoists cannot pull SDK 57's preset.
  return {
    presets: [require.resolve("babel-preset-expo")],
  };
};
