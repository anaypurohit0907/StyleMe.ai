// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // eslint-plugin-import follows expo-haptics' `expo-source` export
      // condition to an unpublished ./src/Haptics.ts; Metro and tsc resolve
      // the `default` build. Narrow ignore only — no broad resolver disable.
      'import/no-unresolved': ['error', { ignore: ['^expo-haptics$'] }],
    },
  },
]);
