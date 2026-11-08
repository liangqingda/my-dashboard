#!/usr/bin/env node
/**
 * My Dashboard — SCSS 排版检查
 *
 * SCSS 不在 ESLint 的管辖范围内（ESLint 只处理 .js/.ts/.tsx/.vue），
 * 而「块与块之间空行隔离、选择器列表不被空行截断」这两条是本仓库的硬排版要求，
 * 因此用与 check-structure.mjs 同风格的零依赖脚本兜底：
 *  1. 块与块之间必须有空行：上一块以 `}` 结束、下一行又是新块（以 `{` 结束）时，
 *     中间至少要有一个空行。缺空行会让整份样式挤成一坨，diff 也看不出边界。
 *  2. 选择器列表内不得有空行：`.a,` 与 `.b {` 之间插空行不会报错（Sass 仍按同一个
 *     列表编译），但会让人误以为它们是两个块，按「} 后空行」拆文件时就会拆错。
 *  3. 不允许连续多个空行、行尾空格与文件末尾缺少换行（纯卫生问题，一次说清）。
 *
 * 注释块内部不参与判断（文档注释里出现 `}` 或 `,` 属正常写法）。
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const errors = [];

/** 收集目录下所有 .scss 文件（含多级） */
function collectScss(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) collectScss(abs, out);
    else if (entry.name.endsWith('.scss')) out.push(abs);
  }

  return out;
}

/**
 * 把文件切成「代码行」序列：注释块整段剔除，避免文档注释里的符号被当成语法。
 * 返回 { line, text, isBlank }，line 是原始行号（1 起）。
 */
function toCodeLines(source) {
  const lines = source.split('\n');
  const result = [];
  let inBlockComment = false;

  lines.forEach((raw, index) => {
    const text = raw.trim();

    if (inBlockComment) {
      if (text.includes('*/')) inBlockComment = false;

      return;
    }

    if (text.startsWith('/*') && !text.includes('*/')) {
      inBlockComment = true;

      return;
    }

    if (text.startsWith('/*') || text.startsWith('//')) return;

    result.push({ isBlank: text === '', line: index + 1, text });
  });

  return result;
}

/** 判断一行是否开启一个新块（选择器 / at-rule 收尾是 `{`） */
const opensBlock = (text) => text.endsWith('{');

/** 判断一行是否结束一个块 */
const closesBlock = (text) => text === '}' || text.endsWith('}');

function checkFile(file) {
  const rel = path.relative(ROOT, file);
  const source = readFileSync(file, 'utf8');
  const rawLines = source.split('\n');

  if (!source.endsWith('\n')) {
    errors.push(`${rel}: 文件末尾缺少换行`);
  }

  if (source.endsWith('\n\n')) {
    errors.push(`${rel}: 文件末尾多了空行`);
  }

  rawLines.forEach((raw, index) => {
    if (/\s+$/u.test(raw) && raw.trim() !== '') {
      errors.push(`${rel}:${index + 1} 行尾有多余空格`);
    }
  });

  const lines = toCodeLines(source);

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];

    if (current.isBlank) {
      const previous = lines[index - 1];
      const next = lines[index + 1];

      // 连续空行：两块之间只留一个空行
      if (previous && previous.isBlank) {
        errors.push(`${rel}:${current.line} 连续多个空行`);
      }

      // 选择器列表被空行截断
      if (previous && previous.text.endsWith(',')) {
        errors.push(
          `${rel}:${previous.line} 选择器列表被空行截断（"${previous.text}" 与下一行属同一个块，删掉中间的空行）`,
        );
      }

      // 块间空行已存在，跳过
      if (next && next.isBlank) continue;

      continue;
    }

    const next = lines[index + 1];

    if (!next || next.isBlank) continue;

    // 上一行结束了一个块、下一行又开始新块：中间必须有空行
    if (closesBlock(current.text) && opensBlock(next.text)) {
      errors.push(
        `${rel}:${current.line} 块间缺少空行（"${current.text}" 与第 ${next.line} 行的 "${next.text}" 之间要空一行）`,
      );
    }
  }
}

const files = collectScss(SRC);

for (const file of files) checkFile(file);

if (errors.length > 0) {
  console.error('[×] SCSS 排版检查未通过：');

  for (const message of errors) console.error(`  ${message}`);

  process.exit(1);
}

console.log(`[✓] SCSS 排版检查通过：${files.length} 个样式文件块间均有空行`);
