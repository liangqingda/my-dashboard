#!/usr/bin/env node
/**
 * My Dashboard — import 分组检查（补 import/order 查不到的部分）
 *
 * 分层与空行由 `import/order` 负责（见 eslint.config.js：公共 `@/**` 归 internal，
 * `@/pages/**` 归 parent，`newlines-between: always`），但有三件事它管不到：
 *
 *  1. 值导入里内联 type（`import { a, type B }`）：类型一律单独 `import type`，
 *     否则「哪些是类型」在文件头看不出来（本项目未启用 consistent-type-imports）。
 *  2. 页面 / 组件 / 布局目录内部引用自己的文件必须用相对路径，不得绕回 `@/`。
 *     跨出所属目录才用 `@/`（相对路径跨出页面目录由 check-structure.mjs 拦截）。
 *  3. `@/pages/**` 必须排在其它 `@/` 之后：import/order 把它们放在了不同组（parent /
 *     internal），但脚本再兜一层顺序断言，避免有人调 pathGroups 时静默失去分层。
 *
 * 注意：不要在这里再实现一遍「type 组位置」的判断——实测 import/order 的规则是
 * 「相对路径 type 单独成组、`@/` type 留在原组」，重复实现两套规则必然漂移。
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CODE_EXTS = new Set(['.ts', '.tsx']);

const errors = [];

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) collectFiles(abs, out);
    else if (CODE_EXTS.has(path.extname(entry.name))) out.push(abs);
  }

  return out;
}

/** 从文本里取最后一个引号字符串，作为 import 的目标说明符 */
function extractSpecifier(statement) {
  const matches = [...statement.matchAll(/['"]([^'"]+)['"]/gu)];

  return matches.length > 0 ? matches[matches.length - 1][1] : '';
}

/** 解析 import 语句：多行 import 以 `;` 收尾，按行拼成一条 */
function parseImports(source) {
  const lines = source.split('\n');
  const imports = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!/^import\b/u.test(line)) continue;

    let statement = line;
    let end = index;

    while (!statement.trimEnd().endsWith(';') && end + 1 < lines.length) {
      end += 1;
      statement += `\n${lines[end]}`;
    }

    imports.push({ line: index + 1, statement });
    index = end;
  }

  return imports;
}

/** 页面 / 组件 / 布局目录自身的根，用于「内部必须相对路径」判断 */
const OWN_ROOT_PATTERN = /^src\/(pages|components|layouts)\/([^/]+)\//u;

function checkFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const source = readFileSync(file, 'utf8');
  const ownMatch = OWN_ROOT_PATTERN.exec(rel);
  const ownPrefix = ownMatch ? `@/${ownMatch[1]}/${ownMatch[2]}/` : null;

  /** @/ 导入的层级：0 公共，1 页面 */
  const aliasRanks = [];

  for (const item of parseImports(source)) {
    const { line, statement } = item;
    const specifier = extractSpecifier(statement);

    if (!/\bfrom\b/u.test(statement)) continue;

    if (/\{[^}]*\btype\s+[\w{]/u.test(statement)) {
      errors.push(
        `${rel}:${line} 值导入里内联了 type，请拆成单独的 import type：${statement.split('\n')[0]}`,
      );
    }

    if (ownPrefix && specifier.startsWith(ownPrefix)) {
      errors.push(
        `${rel}:${line} 引用本目录文件应使用相对路径，不要用 "${specifier}"`,
      );
    }

    if (specifier.startsWith('@/')) {
      aliasRanks.push({
        line,
        page: specifier.startsWith('@/pages/'),
        specifier,
      });
    }
  }

  let sawPage = null;

  for (const entry of aliasRanks) {
    if (entry.page) {
      sawPage ??= entry;

      continue;
    }

    if (sawPage) {
      errors.push(
        `${rel}:${entry.line} 公共导入 "${entry.specifier}" 排在了页面导入 "${sawPage.specifier}"（第 ${sawPage.line} 行）之后；公共能力应在前，页面代码在后`,
      );
    }
  }
}

const files = collectFiles(SRC);

for (const file of files) checkFile(file);

if (errors.length > 0) {
  console.error('[×] import 分组检查未通过：');

  for (const message of errors) console.error(`  ${message}`);

  process.exit(1);
}

console.log(`[✓] import 分组检查通过：${files.length} 个源文件符合分组约定`);
