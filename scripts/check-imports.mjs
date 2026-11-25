#!/usr/bin/env node
/**
 * My Dashboard — 引用检查（补共享 ESLint 配置查不到的那几条）
 *
 * 分组、组间空行、`@/pages/**` 排在公共 `@/**` 之后、值导入里的 `type` 必须单独成句，
 * 这些现在都由 `@liangqingda/eslint-config` 的 `react-typed` 强制（共享包 1.4.0 起），
 * 本脚本不再重复实现，只保留 ESLint 表达不了的两条：
 *
 *   1. 页面 / 组件 / 布局目录内部引用自己的文件必须用相对路径，不得绕回 `@/`。
 *      「相对自己这一页」这种判断 ESLint 的 `no-restricted-imports` 写不出来
 *      （它只能禁止某个 pattern，不能表达「只禁止本目录的别名写法」），所以留在这里。
 *      跨出所属目录才用 `@/`（相对路径跨出页面目录由 check-structure.mjs 拦截）。
 *   2. `dependencies` 里的包必须在源码里真的被 import。功能下线后遗留的包没人会再看
 *      package.json 才发现，ESLint 也不判依赖清单，只能在这里对一遍。
 *
 * 别在这里再加回分组/顺序/type 的判断：规则一旦在共享包里，两处维护必然漂移。
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
const OWN_ROOT_PATTERNS = [
  /^src\/pages\/([^/]+)\//u,
  // 公共组件按类型分目录：src/components/<分类>/<组件>/
  /^src\/components\/([^/]+)\/([^/]+)\//u,
  /^src\/layouts\/([^/]+)\//u,
];

/** 取当前文件所属的「自身根」别名前缀，不属于页面 / 组件 / 布局目录时返回 null */
function getOwnAliasPrefix(rel) {
  const [pagesMatch, componentsMatch, layoutsMatch] = OWN_ROOT_PATTERNS.map(
    (pattern) => pattern.exec(rel),
  );

  if (componentsMatch) {
    return `@/components/${componentsMatch[1]}/${componentsMatch[2]}/`;
  }

  if (pagesMatch) return `@/pages/${pagesMatch[1]}/`;
  if (layoutsMatch) return `@/layouts/${layoutsMatch[1]}/`;

  return null;
}

function checkFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const source = readFileSync(file, 'utf8');
  const ownPrefix = getOwnAliasPrefix(rel);

  if (!ownPrefix) return;

  for (const item of parseImports(source)) {
    const { line, statement } = item;
    const specifier = extractSpecifier(statement);

    if (!/\bfrom\b/u.test(statement)) continue;

    if (specifier.startsWith(ownPrefix)) {
      errors.push(
        `${rel}:${line} 引用本目录文件应使用相对路径，不要用 "${specifier}"`,
      );
    }
  }
}

const files = collectFiles(SRC);

for (const file of files) checkFile(file);

/** 依赖清单与源码两处要对上：源码 import 过的包才算在用 */
function checkDependencies() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const dependencyNames = Object.keys(pkg.dependencies ?? {});
  const scriptFiles = collectFiles(path.join(ROOT, 'scripts', 'vite'));
  const agentFiles = readdirSync(path.join(ROOT, 'agent'))
    .filter((name) => name.endsWith('.mjs'))
    .map((name) => path.join(ROOT, 'agent', name));
  const specifiers = [...files, ...scriptFiles, ...agentFiles].flatMap((file) =>
    parseImports(readFileSync(file, 'utf8')).map((item) =>
      extractSpecifier(item.statement),
    ),
  );

  for (const name of dependencyNames) {
    const used = specifiers.some(
      (specifier) => specifier === name || specifier.startsWith(`${name}/`),
    );

    if (!used) {
      errors.push(
        `package.json 的依赖 "${name}" 没有任何源码 import：能力下线时同步删掉这个包与 lockfile 条目`,
      );
    }
  }
}

checkDependencies();

if (errors.length > 0) {
  console.error('[×] 引用检查未通过：');

  for (const message of errors) console.error(`  ${message}`);

  process.exit(1);
}

console.log(
  `[✓] 引用检查通过：${files.length} 个源文件内部引用均为相对路径，dependencies 均有源码 import`,
);
