module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
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
    },
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname
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
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',

    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-vars': 'warn',
    'react/jsx-uses-react': 'off',
    'react/no-unescaped-entities': 'off',
    'react/no-unknown-property': 'off',

    // Prettier (warning only — codebase not yet fully formatted)
    'prettier/prettier': 'warn',

    // General rules
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-empty': 'warn',
    'prefer-const': 'warn',
    'eqeqeq': 'warn',
    'curly': 'off',
    'brace-style': 'off'
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
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