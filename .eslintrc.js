module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors
    'no-undef': 'off', // TypeScript handles this
  },
  env: {
    node: true,
    browser: true,
    es6: true,
    jest: true,
  },
  globals: {
    MediaTrackConstraints: 'readonly',
    MediaDeviceInfo: 'readonly',
    MediaStream: 'readonly',
    File: 'readonly',
  },
};