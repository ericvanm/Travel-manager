module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['migrations/'],
  rules: {
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['controllers/**/*.js', 'utils/middleware.js', 'utils/ai-service.js'],
      rules: {
        'no-unused-vars': 'off',
        'no-inner-declarations': 'off',
        'no-useless-escape': 'off',
      },
    },
  ],
}
