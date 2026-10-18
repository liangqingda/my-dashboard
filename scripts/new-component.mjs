#!/usr/bin/env node
/**
 * My Dashboard — 新建组件脚手架
 *
 * 用法：pnpm component:new <相对 src/ 的路径>
 * 例如：pnpm component:new features/services/log-detail
 *       pnpm component:new pages/home/quick-actions
 *
 * 会生成 <路径>/index.tsx + <路径>/index.scss，
 * 并校验每一级路径目录名都是 kebab-case，默认产出即符合约定。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 把 kebab-case 转成 PascalCase 用于组件名 */
const toPascal = (segment) =>
  segment
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');

const rel = process.argv[2];

if (!rel) {
  console.error('用法: pnpm component:new <相对 src/ 的路径，如 features/services/log-detail>');
  process.exit(1);
}

const segments = rel.split('/').filter(Boolean);

for (const segment of segments) {
  if (!KEBAB.test(segment)) {
    console.error(`[×] 路径段 "${segment}" 须 kebab-case（小写+连字符）`);
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

const name = toPascal(segments[segments.length - 1]);

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
console.log('组件目录 kebab-case、带 index.tsx + index.scss，已符合项目约定。');
