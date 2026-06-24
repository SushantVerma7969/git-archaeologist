const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'action/**', 'research/**', 'test/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase intentionally uses `any` in a few parser/serialization spots;
      // warn rather than error so lint stays useful without being a wall of red.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // htmlReport.ts builds HTML as template strings. An escaped slash in a
    // closing </script> tag is deliberate there — it stops the inline script
    // from terminating early when the HTML is parsed — so the otherwise-correct
    // no-useless-escape rule produces false positives in this one file.
    files: ['src/output/htmlReport.ts'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
  {
    // formatter.ts strips ANSI color codes with a control-character regex (\x1b),
    // which is the intended behaviour, not a mistake.
    files: ['src/output/formatter.ts'],
    rules: {
      'no-control-regex': 'off',
    },
  },
);
