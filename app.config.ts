import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "FrierenCloud",
  slug: "frierencloud",
  version: process.env.APP_VERSION ?? "1.0.0",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "dark",
  plugins: ["expo-router", "expo-web-browser"],
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
