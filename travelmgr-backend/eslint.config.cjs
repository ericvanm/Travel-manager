const js = require('@eslint/js')
const globals = require('globals')

const relaxedControllerFiles = [
  'controllers/**/*.js',
  'utils/middleware.js',
  'utils/ai-service.js',
]

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['migrations/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
    },
  },
  {
    files: relaxedControllerFiles,
    rules: {
      'no-unused-vars': 'off',
      'no-inner-declarations': 'off',
      'no-useless-escape': 'off',
    },
  },
]
