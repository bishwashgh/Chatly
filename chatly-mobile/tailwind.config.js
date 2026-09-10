module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#006E28",
        primaryLight: "#34C759",
        accent: "#34C759",
        surface: "#FAF9FE",
        surfaceLow: "#F4F3F8",
        surfaceHigh: "#E9E7ED",
      },
    },
  },
  plugins: [],
};
