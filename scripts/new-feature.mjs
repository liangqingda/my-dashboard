#!/usr/bin/env node
/**
 * My Dashboard — 新建 feature 模块脚手架
 *
 * 用法：pnpm feature:new <kebab-case 名称>
 * 例如：pnpm feature:new study-plan
 *
 * 会创建 src/features/<名称>/，内置一份结构指引 README，
 * 确保新模块的默认产出符合项目约定（目录 kebab-case、组件 index.tsx+index.scss 等）。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEATURES = path.join(ROOT, 'src', 'features');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const name = process.argv[2];

if (!name) {
  console.error('用法: pnpm feature:new <kebab-case 名称>');
  process.exit(1);
}

if (!KEBAB.test(name)) {
  console.error(`[×] 名称 "${name}" 不是 kebab-case（小写字母/数字，用连字符分隔）`);
  process.exit(1);
}

const dir = path.join(FEATURES, name);

if (existsSync(dir)) {
  console.error(`[×] ${path.relative(ROOT, dir)} 已存在`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const readme = `# ${name}

本目录是 ${name} 业务功能模块，自包含地存放该功能的所有代码。

## 目录约定

- 目录名一律 kebab-case（小写 + 连字符）。
- 组件各自一个目录：\`<组件名>/index.tsx\` + \`<组件名>/index.scss\`（CSS Module，类名自动 camelCase）。
- 子组件直接放在父组件目录内，不套 \`components/\` 层。
- 可复用界面 → 组件；独立状态/副作用 → hook；与界面无关的纯逻辑 → utils。
- 跨模块引用一律用 \`@/features/...\` 别名，禁止相对导入跨出本模块。
- 共享代码（types / api / utils / hooks）带 JSDoc 注释。

## 常用命令

\`\`\`bash
pnpm component:new features/${name}/<组件名>   # 生成一个合规组件
pnpm check:features                            # 跑结构检查
pnpm lint                                       # 完整 lint（含结构检查）
\`\`\`
`;

writeFileSync(path.join(dir, 'README.md'), readme, 'utf8');

console.log(`[✓] 已创建 ${path.relative(ROOT, dir)}/`);
console.log('下一步：添加 types.ts / api.ts / hooks/ 与组件目录。');
console.log('组件用 pnpm component:new features/<名称>/<组件名> 生成，默认即合规。');
