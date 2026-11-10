import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCategoryPlan,
  categoryKeyFromContent,
  categoryKeyFromName,
  getNoteCategoryKey,
} from '../../src/pages/English/utils/category.ts';

/** 造一篇最小笔记：只有分类解析关心的两个字段有意义 */
const note = (name: string, content: string) => ({
  name,
  content,
  updatedAt: '2026-11-10T00:00:00.000Z',
});

/** 造一段正文里的记录 ID 行 */
const recordIdRow = (id: string) =>
  `<tr><td>记录 ID / 试卷 ID</td><td>${id}</td></tr>`;

/** 记录仓库的默认分类清单（与 learning-record-notes/categories.json 一致） */
const CONFIG = [
  { key: 'errors', label: '错题' },
  { key: 'phrases', label: '短语' },
  { key: 'usage', label: '用法' },
  { key: 'grammar', label: '语法' },
  { key: 'vocabulary', label: '词汇' },
  { hidden: true, key: 'paper', label: '套题' },
];

describe('从正文解析分类键', () => {
  it('取记录 ID 的冒号前缀', () => {
    assert.equal(categoryKeyFromContent(recordIdRow('errors:foo-bar')), 'errors');
  });

  it('正文没有记录 ID 行时返回空串', () => {
    assert.equal(categoryKeyFromContent('## 讲解\n\n没有基础信息表'), '');
  });

  it('文件名兜底按第一个连字符切', () => {
    assert.equal(categoryKeyFromName('errors-foo-bar.md'), 'errors');
    assert.equal(categoryKeyFromName('caret.md'), '');
  });

  it('正文优先于文件名', () => {
    assert.equal(
      getNoteCategoryKey(note('errors-foo.md', recordIdRow('grammar:foo'))),
      'grammar',
    );
  });

  it('正文缺失时回落到文件名', () => {
    assert.equal(getNoteCategoryKey(note('usage-a-b.md', '')), 'usage');
  });
});

describe('分类方案', () => {
  it('按清单顺序成列，空列也保留', () => {
    const plan = buildCategoryPlan([], CONFIG);

    assert.deepEqual(
      plan.columns.map((column) => column.key),
      ['errors', 'phrases', 'usage', 'grammar', 'vocabulary'],
    );
  });

  it('清单里标 hidden 的分类不进列、也不展示对应笔记', () => {
    const plan = buildCategoryPlan(
      [note('paper-mock-exam.md', recordIdRow('paper:mock-exam'))],
      CONFIG,
    );

    assert.equal(plan.isVisible('paper'), false);
    assert.equal(
      plan.columns.some((column) => column.key === 'paper'),
      false,
    );
  });

  it('笔记里出现、清单没声明的分类照样成列，不被静默丢掉', () => {
    const plan = buildCategoryPlan(
      [note('pattern-a.md', recordIdRow('pattern:a'))],
      CONFIG,
    );

    assert.equal(plan.isVisible('pattern'), true);
    assert.deepEqual(plan.columns.at(-1), { key: 'pattern', label: 'pattern' });
  });

  it('清单整体缺失时按出现的键成列，标题回落成键名', () => {
    const plan = buildCategoryPlan(
      [
        note('usage-b.md', recordIdRow('usage:b')),
        note('errors-a.md', recordIdRow('errors:a')),
      ],
      [],
    );

    assert.deepEqual(
      plan.columns.map((column) => column.key),
      ['errors', 'usage'],
    );
    assert.equal(plan.labels.get('errors'), 'errors');
  });

  it('认不出分类的笔记归到末尾的未分类列', () => {
    const plan = buildCategoryPlan([note('caret.md', '')], CONFIG);

    assert.deepEqual(plan.columns.at(-1), { key: '', label: '未分类' });
    assert.equal(plan.isVisible(''), true);
    assert.equal(plan.orders.get(''), plan.columns.length - 1);
  });
});
