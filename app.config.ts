import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "FrierenCloud",
  slug: "frierencloud",
  scheme: "frierencloud",
  version: process.env.APP_VERSION ?? "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  backgroundColor: "#12213C",
  icon: "./assets/icon.png",
  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#12213C",
      },
    ],
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.minhneky.frierencloud",
    buildNumber: "1",
  },
  android: {
    package: "com.minhneky.frierencloud",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundColor: "#FFFFFF",
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    appName: "FrierenCloud",
    appSlug: "frierencloud",
    logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663896208840/AEiowdkLohwOvDaO.webp",
  },
});
