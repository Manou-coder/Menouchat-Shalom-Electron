import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/out/',
    '**/release/',
    '**/coverage/',
    // Verbatim copy of v1, the reference the fixture is generated from.
    'tests/reference/v1/',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
  },
  {
    // The core is pure: no I/O, no platform APIs, and the date is always a parameter.
    files: ['packages/core/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(node:|electron|fastify|@fastify/)',
              message: 'packages/core must stay free of Node, Electron and server code.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Pass the date in; packages/core never reads the clock.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Pass the date in; packages/core never reads the clock.',
        },
      ],
    },
  },
  {
    // The web app imports the router's type from here, so it must stay free of Node,
    // Electron and server code.
    files: ['apps/desktop/src/main/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(node:|electron|fastify|@fastify/|\\.\\./server)',
              message: 'The API layer must not depend on Node, Electron or the server.',
            },
          ],
        },
      ],
    },
  },
);
