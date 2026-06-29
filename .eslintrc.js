module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // TypeScript rules
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/no-non-null-assertion': 'off',

    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-vars': 'warn',
    'react/jsx-uses-react': 'off',

    // Prettier
    'prettier/prettier': 'error',

    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-use-before-define': ['error', { 'functions': false, 'classes': true, 'variables': false }],
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'brace-style': ['error', '1tbs']
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: [
        'plugin:@typescript-eslint/recommended-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked'
      ],
      parserOptions: {
        project: ['./tsconfig.json']
      }
    },
    {
      files: ['*.js', '*.jsx'],
      extends: [],
      parserOptions: {
        ecmaVersion: 2020
      }
    }
  ]
};