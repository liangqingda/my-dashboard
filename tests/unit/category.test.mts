import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCategoryPlan } from '../../src/pages/English/utils/category.ts';

/** 造一条最小摘要：只有分类方案关心的字段有意义 */
const summary = (name: string, categoryKey: string) => ({
  categoryKey,
  name,
  topic: '',
  updatedAt: '2026-11-10T00:00:00.000Z',
});

/** 记录仓库的默认分类清单（与 learning-record-notes/categories.json 一致） */
const CONFIG = [
  { key: 'errors', label: '错题' },
  { key: 'phrases', label: '短语' },
  { key: 'usage', label: '用法' },
  { key: 'grammar', label: '语法' },
  { key: 'vocabulary', label: '词汇' },
  { hidden: true, key: 'paper', label: '套题' },
];

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
      [summary('paper-mock-exam.md', 'paper')],
      CONFIG,
    );

    assert.equal(plan.isVisible('paper'), false);
    assert.equal(
      plan.columns.some((column) => column.key === 'paper'),
      false,
    );
  });

  it('笔记里出现、清单没声明的分类照样成列，不被静默丢掉', () => {
    const plan = buildCategoryPlan([summary('pattern-a.md', 'pattern')], CONFIG);

    assert.equal(plan.isVisible('pattern'), true);
    assert.deepEqual(plan.columns.at(-1), { key: 'pattern', label: 'pattern' });
  });

  it('清单整体缺失时按出现的键成列，标题回落成键名', () => {
    const plan = buildCategoryPlan(
      [summary('usage-b.md', 'usage'), summary('errors-a.md', 'errors')],
      [],
    );

    assert.deepEqual(
      plan.columns.map((column) => column.key),
      ['errors', 'usage'],
    );
    assert.equal(plan.labels.get('errors'), 'errors');
  });

  it('认不出分类的笔记归到末尾的未分类列', () => {
    const plan = buildCategoryPlan([summary('caret.md', '')], CONFIG);

    assert.deepEqual(plan.columns.at(-1), { key: '', label: '未分类' });
    assert.equal(plan.isVisible(''), true);
    assert.equal(plan.orders.get(''), plan.columns.length - 1);
  });
});
