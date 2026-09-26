// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "android/*",
      "ios/*",
      // Dead React Navigation layer — never bundled (entry is expo-router/entry). Delete it.
      "App.tsx",
      "index.ts",
      "src/screens/*",
      "src/navigation/*",
    ],
  },
  {
    rules: {
      // React Compiler rules. This app does not use the compiler, and the
      // documented React Native pattern `useRef(new Animated.Value(0)).current`
      // trips `refs` everywhere; keep them visible as warnings, not errors.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react/display-name": "warn",
      // Apostrophes and quotes in JSX text render fine; still catch stray > and }.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", require: "readonly", module: "readonly", process: "readonly", console: "readonly", performance: "readonly" },
    },
  },
]);
