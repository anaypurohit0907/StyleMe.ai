/**
 * Expo autolinking skips onnxruntime-react-native because the package ships a
 * legacy `unimodule.json` (treated as an Expo module) alongside a Gradle build.
 * Force the standard React Native Android link.
 */
module.exports = {
  dependencies: {
    "onnxruntime-react-native": {
      platforms: {
        android: {
          sourceDir: "android",
          packageImportPath: "import ai.onnxruntime.reactnative.OnnxruntimePackage;",
          packageInstance: "new OnnxruntimePackage()",
        },
      },
    },
  },
};
