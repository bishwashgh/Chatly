module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#4A6CF7",
        primaryLight: "#34C1B0",
        accent: "#34C1B0",
      },
    },
  },
  plugins: [],
};
