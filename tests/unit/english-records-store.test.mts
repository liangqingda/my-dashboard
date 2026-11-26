import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  MASTERED_RECORDS_DIR,
  RECORDS_DIR,
  collectRecordDetails,
  collectRecordSummaries,
  isRecordId,
  readRecordDetail,
  recordCategory,
  recordDetailPath,
  toRecordSummary,
} from '../../scripts/vite/english-records-store.ts';

/** 学习中的记录文件：根节点带 records 映射，ID 是映射键 */
const LEARNING_GRAMMAR = {
  category: 'grammar',
  records: {
    'grammar:old-review': {
      explanation: '早就复习过的',
      id: 'grammar:old-review',
      last_learned_at: '2026-10-01T08:00:00Z',
      last_reviewed_at: '2026-10-20T08:00:00Z',
      mastery_score: 6,
      status: 'learning',
      title: '旧复习',
    },
    'grammar:never-learned': {
      // 没有任何时间字段：排序时应落到最后
      id: 'grammar:never-learned',
      status: 'familiar',
      title: '没有时间',
    },
    'grammar:new-learn': {
      id: 'grammar:new-learn',
      last_learned_at: '2026-11-15T08:00:00Z',
      status: 'learning',
      title: '新学的',
    },
    'grammar:wrong-category': {
      // ID 分类与文件名对不上：应被丢弃，不能出现在列表里
      id: 'vocabulary:wrong-category',
      status: 'learning',
      title: '分类不符',
    },
    'grammar:bad-status': {
      id: 'grammar:bad-status',
      status: 'unknown',
      title: '状态认不出',
    },
  },
};

/** 已掌握记录：根节点是数组，字段更精简 */
const MASTERED_GRAMMAR = [
  {
    explanation: '已经掌握的一条',
    id: 'grammar:mastered-one',
    mastered_at: '2026-11-10T08:00:00Z',
    mastered_ten_streak: 2,
    tags: ['时态', ''],
    title: '已掌握',
  },
];

/** 已掌握目录里一份坏掉的 JSON：只丢这一类，不影响其它记录 */
const BROKEN_FILE = '{ 不是 JSON';

describe('english-records-store', () => {
  let repoDir = '';

  before(async () => {
    repoDir = await mkdtemp(path.join(tmpdir(), 'records-store-'));

    await mkdir(path.join(repoDir, RECORDS_DIR), { recursive: true });
    await mkdir(path.join(repoDir, MASTERED_RECORDS_DIR), { recursive: true });

    await writeFile(
      path.join(repoDir, RECORDS_DIR, 'grammar.json'),
      JSON.stringify(LEARNING_GRAMMAR),
    );
    await writeFile(
      path.join(repoDir, MASTERED_RECORDS_DIR, 'grammar.json'),
      JSON.stringify(MASTERED_GRAMMAR),
    );
    await writeFile(
      path.join(repoDir, MASTERED_RECORDS_DIR, 'vocabulary.json'),
      BROKEN_FILE,
    );
  });

  after(async () => {
    await rm(repoDir, { force: true, recursive: true });
  });

  it('校验记录 ID 与详情路径', () => {
    assert.equal(isRecordId('grammar:present-perfect'), true);
    assert.equal(isRecordId('GRAMMAR:present-perfect'), false);
    assert.equal(isRecordId('grammar:'), false);
    assert.equal(isRecordId('grammar'), false);
    assert.equal(recordCategory('grammar:present-perfect'), 'grammar');
    assert.equal(recordCategory('bad'), '');
    assert.equal(
      recordDetailPath('grammar:present-perfect'),
      'grammar/present-perfect.json',
    );
  });

  it('合并两个目录，按更新时间倒序，无时间的排最后', async () => {
    const details = await collectRecordDetails(repoDir);
    const ids = details.map((detail) => detail.id);

    assert.deepEqual(ids, [
      'grammar:new-learn',
      'grammar:mastered-one',
      'grammar:old-review',
      'grammar:never-learned',
    ]);
  });

  it('已掌握记录统一成 mastered 状态并补齐字段', async () => {
    const details = await collectRecordDetails(repoDir);
    const mastered = details.find((detail) => detail.id === 'grammar:mastered-one');

    assert.ok(mastered);
    assert.equal(mastered.status, 'mastered');
    assert.equal(mastered.masteryScore, 10);
    assert.equal(mastered.masteredTenStreak, 2);
    assert.equal(mastered.reviewCount, 0);
    assert.deepEqual(mastered.tags, ['时态']);
    assert.deepEqual(mastered.reviewHistory, []);
    assert.equal(mastered.updatedAt, '2026-11-10T08:00:00Z');
  });

  it('丢弃分类不符、状态认不出与坏掉的 JSON，不影响正常记录', async () => {
    const details = await collectRecordDetails(repoDir);
    const ids = details.map((detail) => detail.id);

    assert.equal(ids.includes('grammar:wrong-category'), false);
    assert.equal(ids.includes('grammar:bad-status'), false);
    assert.ok(ids.length >= 4);
  });

  it('摘要不下发讲解与例句，但带上连续满分计数', async () => {
    const summaries = await collectRecordSummaries(repoDir);
    const summary = summaries[0];

    assert.ok(summary);
    assert.equal('explanation' in summary, false);
    assert.equal('source' in summary, false);
    assert.equal('reviewHistory' in summary, false);
    // 学习中的记录没有连续满分计数，列表按 null 显示占位
    assert.equal(summary.masteredTenStreak, null);

    const mastered = summaries.find((item) => item.id === 'grammar:mastered-one');

    assert.ok(mastered);
    assert.equal(mastered.masteredTenStreak, 2);
  });

  it('摘要与详情两条路推导出的字段完全一致', async () => {
    const summaries = await collectRecordSummaries(repoDir);
    const fromDetails = (await collectRecordDetails(repoDir)).map(
      toRecordSummary,
    );

    // 摘要直出省掉的是「详情对象」，不是字段：两条路必须给出同一份列表数据
    assert.deepEqual(summaries, fromDetails);
  });

  it('按 ID 取详情：先学习库，再已掌握库，取不到返回 null', async () => {
    const learning = await readRecordDetail(repoDir, 'grammar:new-learn');

    assert.ok(learning);
    assert.equal(learning.title, '新学的');

    const mastered = await readRecordDetail(repoDir, 'grammar:mastered-one');

    assert.ok(mastered);
    assert.equal(mastered.status, 'mastered');

    assert.equal(await readRecordDetail(repoDir, 'grammar:missing'), null);
    assert.equal(await readRecordDetail(repoDir, 'bad-id'), null);
  });
});
