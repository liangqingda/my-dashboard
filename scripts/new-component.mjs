#!/usr/bin/env node
/**
 * My Dashboard — 新建组件脚手架
 *
 * 用法：pnpm component:new <相对 src/ 的路径>
 * 例如：pnpm component:new components/modals/FreeDialog
 *       pnpm component:new pages/Services/LogDetail
 *
 * 会生成 <路径>/index.tsx + <路径>/index.scss。
 * 公共组件必须落在分类目录下（components/<分类>/<组件>），分类目录用小写固定名单，
 * 组件目录与页面目录用 PascalCase；最后一段写成 kebab-case 时自动转 PascalCase。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][a-zA-Z0-9]*$/;

/** 公共组件的分类目录：src/components/<分类>/<组件> */
const COMPONENT_GROUPS = new Set([
  'buttons',
  'fields',
  'feedback',
  'modals',
  'panels',
  'tables',
  'texts',
]);

/** 把 kebab-case 转成 PascalCase 用于组件名 */
const toPascal = (segment) =>
  segment
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

const rel = process.argv[2];

if (!rel) {
  console.error(
    '用法: pnpm component:new <相对 src/ 的路径，如 components/modals/FreeDialog、pages/Services/LogDetail>',
  );
  process.exit(1);
}

const segments = rel.split('/').filter(Boolean);
const isPublicComponent = segments[0] === 'components';

if (isPublicComponent) {
  if (segments.length !== 3) {
    console.error('[×] 公共组件路径须为 components/<分类>/<组件>（分类目录见 docs/ui-components.md）');
    process.exit(1);
  }

  if (!COMPONENT_GROUPS.has(segments[1])) {
    console.error(
      `[×] 分类目录 "${segments[1]}" 不在名单里：${[...COMPONENT_GROUPS].join(' / ')}`,
    );
    process.exit(1);
  }
}

const lastSegment = segments[segments.length - 1];
const name = PASCAL.test(lastSegment) ? lastSegment : toPascal(lastSegment);

if (KEBAB.test(lastSegment)) segments[segments.length - 1] = name;

for (const segment of segments) {
  if (!KEBAB.test(segment) && !PASCAL.test(segment)) {
    console.error(`[×] 路径段 "${segment}" 须 PascalCase 或 kebab-case`);
    process.exit(1);
  }
}

const dir = path.join(SRC, ...segments);
const parent = path.dirname(dir);

if (!existsSync(parent)) {
  console.error(`[×] 父目录不存在: ${path.relative(SRC, parent)}`);
  process.exit(1);
}

if (existsSync(path.join(dir, 'index.tsx'))) {
  console.error(`[×] ${path.relative(ROOT, dir)}/index.tsx 已存在`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const tsx = `/**
 * ${name} 组件：TODO 填写用途说明。
 */

import styles from './index.scss';

const ${name} = () => <div className={styles.root} />;

export default ${name};
`;

writeFileSync(path.join(dir, 'index.tsx'), tsx, 'utf8');
writeFileSync(path.join(dir, 'index.scss'), `.root {\n}\n`, 'utf8');

console.log(`[✓] 已生成 ${path.relative(ROOT, dir)}/index.{tsx,scss}`);
