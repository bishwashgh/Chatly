module.exports = function (api) {
  // Do not persist an old transform after EXPO_PUBLIC_* values change.
  api.cache.never();
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
