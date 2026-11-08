import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import reactTypedConfig from '@liangqingda/eslint-config/react-typed';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default [
  ...reactTypedConfig,
  {
    ignores: [
      'dist/**',
      'eslint.config.js',
      '.prettierrc.js',
      'agent/**',
      'scripts/**',
      'tests/**',
      'playwright.config.mjs',
    ],
  },
  {
    // import 分层：第三方 → 类型 → 公共 @/** → 页面 @/pages → 就近相对路径 → 样式。
    // 公共与页面能分成两组，靠把 `@/pages/**` 从 internal 改判到 parent（组间空行随之生效）；
    // 顺序断言另有 scripts/check-imports.mjs 兜底，避免将来调 pathGroups 时静默丢分层。
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '*.{less,css,scss}',
              patternOptions: { matchBase: true },
              group: 'sibling',
              position: 'after',
            },
            { pattern: '@/pages/**', group: 'parent' },
            { pattern: '@/**', group: 'internal' },
          ],
          groups: ['builtin', 'external', 'type', 'internal', ['parent', 'sibling', 'index'], 'object'],
          distinctGroup: true,
          sortTypesGroup: false,
          named: false,
          warnOnUnassignedImports: false,
        },
      ],
    },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json'],
        projectService: false,
        tsconfigRootDir: rootDir,
      },
    },
  },
];
