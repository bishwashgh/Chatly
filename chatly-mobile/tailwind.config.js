module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6D28D9",
        accent: "#22D3EE",
      },
    },
  },
  plugins: [],
};
