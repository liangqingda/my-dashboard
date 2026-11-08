#!/usr/bin/env node
/**
 * Markdown 块级编辑的往返检查。
 *
 * 校验三件事：
 *  1. 每个夹具「原文 → parse → serialize」逐字一致（块级编辑不能无故重排格式）；
 *  2. 结构化编辑只在安全的表格上启用；含内联标签 / thead / tr 属性 / 实体的表格必须降级为源码文本块；
 *  3. 删一行 / 加一行只影响目标行，其余行与 colgroup 不动。
 *
 * 由 `pnpm check:md` 执行，`pnpm lint` 会带上它。
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseMarkdownBlocks,
  serializeMarkdownBlocks,
} from '../src/pages/English/utils/markdown-blocks.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'scripts', 'fixtures', 'md');

/** 必须降级成源码文本块的夹具（出现表格就说明护栏失效） */
const MUST_NOT_STRUCTURE = new Set([
  'table-with-inline-tags.md',
  'table-with-thead.md',
]);

/** 期望至少出现一张结构化表格的夹具 */
const MUST_STRUCTURE = new Set(['note-template.md']);

const failures = [];

/** 断言，失败只记录不中断，最后统一报 */
const check = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const files = readdirSync(FIXTURES).filter((name) => name.endsWith('.md'));

for (const name of files) {
  const source = readFileSync(path.join(FIXTURES, name), 'utf8');
  const blocks = parseMarkdownBlocks(source);
  const roundtrip = serializeMarkdownBlocks(blocks);

  if (roundtrip !== source) {
    failures.push(`往返不一致：${name}`);
  }

  const tables = blocks.filter((block) => block.type === 'table');

  if (MUST_NOT_STRUCTURE.has(name)) {
    check(tables.length === 0, `应降级为源码但仍在做矩阵编辑：${name}`);
  }

  if (MUST_STRUCTURE.has(name)) {
    check(tables.length >= 1, `应做结构化编辑但没有解析出表格：${name}`);
  }
}

// 结构化表格的行操作：删第二行、表尾加一行
const source = readFileSync(path.join(FIXTURES, 'note-template.md'), 'utf8');
const blocks = parseMarkdownBlocks(source);
const table = blocks.find((block) => block.type === 'table');

if (!table || table.type !== 'table') {
  failures.push('行操作检查失败：note-template.md 没有解析出表格');
} else {
  const removed = table.rows[1];
  const removedText = removed?.cells.map((cell) => cell.text).join('|') ?? '';

  const afterRemove = serializeMarkdownBlocks(
    blocks.map((block) =>
      block === table
        ? { ...table, rows: table.rows.filter((row) => row !== removed) }
        : block,
    ),
  );

  if (removedText && afterRemove.includes(removedText)) {
    failures.push(`删除行后原文仍存在该行内容：${removedText}`);
  }

  const colgroup = table.colgroup;

  if (colgroup && !afterRemove.includes(colgroup)) {
    failures.push('删除行后 colgroup 丢失');
  }

  const addedRow = {
    cells: table.rows[0].cells.map((cell) => ({ ...cell, text: '新增' })),
    id: 'fixture-add',
  };

  const afterAdd = serializeMarkdownBlocks(
    blocks.map((block) =>
      block === table ? { ...table, rows: [...table.rows, addedRow] } : block,
    ),
  );

  if (!afterAdd.includes('<tr><td>新增</td>')) {
    failures.push('表尾加行没有写进 Markdown');
  }

  // 加行之后行数应该只多一行
  const countOfRows = (text) => (text.match(/<tr>/gu) ?? []).length;

  if (countOfRows(afterAdd) !== countOfRows(source) + 1) {
    failures.push('表尾加行改变了其它行');
  }
}

if (failures.length > 0) {
  console.error(`✖ Markdown 往返检查失败（${failures.length} 项）`);

  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }

  process.exit(1);
}

console.log(`✓ Markdown 往返检查通过（${files.length} 个夹具）`);
