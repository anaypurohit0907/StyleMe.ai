/**
 * Expo autolinking skips onnxruntime-react-native because the package ships a
 * legacy `unimodule.json` (treated as an Expo module) alongside a Gradle build.
 * Force the standard React Native Android link.
 */
const path = require("path");

module.exports = {
  dependencies: {
    "onnxruntime-react-native": {
      root: path.dirname(require.resolve("onnxruntime-react-native/package.json")),
      platforms: {
        android: {
          sourceDir: "./android",
          packageImportPath: "import ai.onnxruntime.reactnative.OnnxruntimePackage;",
          packageInstance: "new OnnxruntimePackage()",
        },
      },
    },
  },
};
