module.exports = {
  root: true,
  extends: '@react-native',
  // Hermes and Node both provide globalThis; the base config predates it.
  globals: { globalThis: 'readonly' },
};
