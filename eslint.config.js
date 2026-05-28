import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const browserGlobals = {
  AbortController: 'readonly',
  alert: 'readonly',
  Blob: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  clients: 'readonly',
  confirm: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  CustomEvent: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  Notification: 'readonly',
  requestAnimationFrame: 'readonly',
  self: 'readonly',
  sessionStorage: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'build/**', 'buildcheck/**', 'scratch/**', 'node_modules/**', 'android/**', 'patches/**', 'public/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        process: 'readonly',
      },
    },
    rules: {
      'no-empty': 'warn',
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react/jsx-no-target-blank': 'warn',
      'react/no-unescaped-entities': 'warn',
      'no-console': 'off',
      'no-empty': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/display-name': 'off',

    },
  },
];
