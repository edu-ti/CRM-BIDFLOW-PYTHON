module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "google"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  rules: {
    // Desativando a regra de aspas em propriedades que causou o erro
    "quote-props": ["off"],
    quotes: ["off"],
    indent: ["off"],
    "max-len": ["off"],
    "object-curly-spacing": ["off"],
    "comma-dangle": ["off"],
    "require-jsdoc": ["off"],
    "valid-jsdoc": ["off"],
    "no-trailing-spaces": ["off"],
    "eol-last": ["off"],
    "no-unused-vars": ["warn"],
    camelcase: ["off"],
    "new-cap": ["off"],
    "spaced-comment": ["off"],
  },
};
