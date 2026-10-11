module.exports = {
  expo: {
    name: "WebMind",
    slug: "webmind-mobile",
    version: "1.1.0",
    owner: "saeedsaiyed",
    extra: { eas: { projectId: "5f0c25ac-3d05-4822-bbe2-e612f05a8918" } },
    scheme: "webmind",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    ios: { supportsTablet: true, bundleIdentifier: "space.webmind.mobile" },
    android: {
      package: "space.webmind.mobile",
      versionCode: 2,
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F8F7F5",
      },
      blockedPermissions: [
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
    },
    web: { favicon: "./assets/favicon.png", name: "WebMind" },
    plugins: [
      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: ["arm64-v8a", "x86_64"],
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            enableBundleCompression: false,
          },
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 100,
          backgroundColor: "#F8F7F5",
        },
      ],
      "./plugins/signing.cjs",
    ],
  },
};
