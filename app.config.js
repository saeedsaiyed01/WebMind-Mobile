module.exports = {
  expo: {
    name: "WebMind",
    slug: "webmind-mobile",
    version: "1.0.0",
    scheme: "webmind",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true, bundleIdentifier: "space.webmind.mobile" },
    android: {
      package: "space.webmind.mobile",
      versionCode: 1,
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F8F7F3",
      },
      blockedPermissions: [
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      intentFilters: [
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "https", host: "webmind.space", pathPrefix: "/" },
            { scheme: "https", host: "www.webmind.space", pathPrefix: "/" },
            { scheme: "https", host: "web-mind.vercel.app", pathPrefix: "/" },
          ],
        },
      ],
    },
    web: { favicon: "./assets/favicon.png", name: "WebMind" },
    plugins: [
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 100,
          backgroundColor: "#F8F7F3",
        },
      ],
      "./plugins/signing.cjs",
    ],
  },
};
