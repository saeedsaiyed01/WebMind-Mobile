const { withAppBuildGradle } = require("expo/config-plugins");
module.exports = (config) => {
  // EAS configures its own release signing; this plugin only supports local builds.
  if (!process.env.WEBMIND_KEYSTORE_PATH) return config;
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes("WEBMIND_KEYSTORE_PATH")) return mod;
    mod.modResults.contents = mod.modResults.contents.replace(
      "signingConfigs {",
      `signingConfigs {
        webmind {
            if (System.getenv('WEBMIND_KEYSTORE_PATH')) {
                storeFile file(System.getenv('WEBMIND_KEYSTORE_PATH'))
                storePassword System.getenv('WEBMIND_KEYSTORE_PASSWORD')
                keyAlias 'webmind'
                keyPassword System.getenv('WEBMIND_KEYSTORE_PASSWORD')
            }
        }`,
    );
    mod.modResults.contents = mod.modResults.contents.replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/,
      "$1signingConfig System.getenv('WEBMIND_KEYSTORE_PATH') ? signingConfigs.webmind : signingConfigs.debug",
    );
    return mod;
  });
};
