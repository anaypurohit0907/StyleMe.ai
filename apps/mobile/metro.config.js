const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// MobileCLIP ships as an ONNX asset; Metro doesn't know the extension by default.
config.resolver.assetExts.push("onnx");

module.exports = config;
