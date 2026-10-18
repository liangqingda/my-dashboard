#!/usr/bin/env node
/**
 * My Dashboard — feature / 页面结构检查
 *
 * 作为 lint 的一部分执行，强制模块组织约定，补 ESLint 管不到的「目录结构」：
 *  1. src/features 下所有目录名须 kebab-case（小写 + 连字符）
 *  2. 组件目录（含 index.tsx）必须同时有 index.scss
 *  3. features / pages 下不得嵌套 components/ 目录（子组件直接放父组件目录）
 *  4. feature 内跨模块禁止用相对导入绕开 @/ 别名
 *
 * 任一规则被违反 → 打印错误并以退出码 1 结束。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEATURES = path.join(ROOT, 'src', 'features');
const PAGES = path.join(ROOT, 'src', 'pages');
const CODE_EXTS = ['.ts', '.tsx'];

/** kebab-case：小写字母/数字，用单个连字符分隔 */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];

/** 收集目录下所有子目录（含多级），返回 { abs, rel } */
function collectDirs(dir, base) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    result.push({ abs, rel: path.relative(base, abs) });
    result.push(...collectDirs(abs, base));
  }
  return result;
}

/** 收集目录下所有指定扩展名的文件（含多级） */
function collectFiles(dir, exts, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(abs, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(abs);
    }
  }
  return out;
}

/** 从一行源码中提取 import/export 的目标说明符 */
function extractSpecs(line) {
  const specs = [];
  const fromRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = fromRe.exec(line))) specs.push(match[1]);
  const bare = line.match(/^\s*import\s+['"]([^'"]+)['"]/);
  if (bare) specs.push(bare[1]);
  return specs;
}

function checkFeatures() {
  if (!existsSync(FEATURES)) return;

  const dirs = collectDirs(FEATURES, FEATURES);

  for (const { abs, rel } of dirs) {
    const name = path.basename(abs);
    if (!KEBAB.test(name)) {
      errors.push(`[命名] features/${rel} 目录名须 kebab-case（小写+连字符）`);
    }
    if (name === 'components') {
      errors.push(
        `[结构] features/${rel} 不允许嵌套 components/，子组件直接放父组件目录`,
      );
    }
    if (
      existsSync(path.join(abs, 'index.tsx')) &&
      !existsSync(path.join(abs, 'index.scss'))
    ) {
      errors.push(`[结构] features/${rel} 有 index.tsx 缺 index.scss`);
    }
  }

  const files = collectFiles(FEATURES, CODE_EXTS);
  for (const file of files) {
    const relToFeatures = path.relative(FEATURES, file);
    const featureName = relToFeatures.split(path.sep)[0];
    const featureRoot = path.join(FEATURES, featureName);
    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      for (const spec of extractSpecs(line)) {
        if (!spec.startsWith('.')) continue; // 别名 / 裸模块 / node 内置，跳过
        const target = path.resolve(path.dirname(file), spec);
        const inside =
          target === featureRoot || target.startsWith(`${featureRoot}${path.sep}`);
        if (!inside) {
          errors.push(
            `[导入] ${relToFeatures}:${index + 1} 用相对路径 "${spec}" 跨出模块，请改用 @/features/... 别名`,
          );
        }
      }
    });
  }
}

function checkPages() {
  if (!existsSync(PAGES)) return;

  const dirs = collectDirs(PAGES, PAGES);
  for (const { abs, rel } of dirs) {
    if (path.basename(abs) === 'components') {
      errors.push(
        `[结构] pages/${rel} 不允许嵌套 components/，子组件直接放页面目录`,
      );
    }
  }
}

checkFeatures();
checkPages();

if (errors.length > 0) {
  console.error('[×] 结构检查未通过：');
  for (const message of errors) console.error(`  ${message}`);
  process.exit(1);
}

console.log('[✓] 结构检查通过：features / pages 目录组织符合约定');
