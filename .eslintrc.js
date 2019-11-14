module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    APPLICATION_NAME: 'readonly',
    CHOUCAS_VERSION: 'readonly',
    mainPanel: true,
    menuBar: true,
    State: true,
    validators: true,
  },
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  rules: {
    camelcase: 0,
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-underscore-dangle': 0,
    'dot-notation': 1,
  },
};
