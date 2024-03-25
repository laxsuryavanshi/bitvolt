/** @type {import("eslint").Linter.Config} */
module.exports = {
  plugins: ['react', 'react-hooks', 'react-refresh'],
  extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended', 'bitvolt'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // https://ru.legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#eslint
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
  },
}
