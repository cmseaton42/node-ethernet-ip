module.exports = {
    env: {
        "jest/globals": true,
        es6: true,
        node: true
    },
    extends: ["eslint:recommended"],
    parserOptions: {
        ecmaVersion: 8,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
            experimentalObjectRestSpread: true
        }
    },
    rules: {
        indent: ["error", 4],
        "no-console": 0,
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "jest/no-disabled-tests": "warn",
        "jest/no-focused-tests": "error",
        "jest/no-identical-title": "error",
        "jest/prefer-to-have-length": "warn",
        "jest/valid-expect": "error"
    },
    plugins: ["jest"]
};
