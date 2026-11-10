import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  categoryKeyFromContent,
  categoryKeyFromName,
  collectNoteSummaries,
  isNoteName,
  noteCategoryKey,
  noteTopic,
  noteUpdatedAt,
} from '../../scripts/vite/english-notes-store.ts';

/** 合法的笔记文件名：`<category>-<slug>.md`，slug 只用小写 ASCII */
const LEGAL = [
  'errors-wait-missing-preposition-for.md',
  'vocabulary-headquarters.md',
  'phrases-dish-out.md',
  'grammar-modal-verb-base-form.md',
  'usage-cannot-vs-cant.md',
  'errors-modal-verb-takes-base-form.md',
];

/** 不合法的文件名：中文、大写、下划线、无分类前缀，以及路径穿越写法 */
const ILLEGAL = [
  'errors-wait-后遗漏介词-for.md',
  'grammar-情态动词后使用动词原形.md',
  'errors-Foo-Bar.md',
  'errors-foo_bar.md',
  'headquarters.md',
  'errors-foo.json',
  'readme.md',
  '../package.json',
  '/etc/passwd',
  'errors-../package.md',
  'errors -foo.md',
];

describe('笔记文件名校验', () => {
  it('接受与记录仓库同口径的 ASCII 文件名', () => {
    for (const name of LEGAL) {
      assert.equal(isNoteName(name), true, name);
    }
  });

  it('拒绝中文 slug，避免预览层放行源仓库已拒收的文件名', () => {
    assert.equal(isNoteName('errors-wait-后遗漏介词-for.md'), false);
    assert.equal(isNoteName('grammar-情态动词后使用动词原形.md'), false);
  });

  it('拒绝大写、下划线、缺少分类前缀与非 Markdown 文件', () => {
    assert.equal(isNoteName('errors-Foo-Bar.md'), false);
    assert.equal(isNoteName('errors-foo_bar.md'), false);
    assert.equal(isNoteName('headquarters.md'), false);
    assert.equal(isNoteName('errors-foo.json'), false);
  });

  it('拒绝路径穿越与目录说明文件', () => {
    assert.equal(isNoteName('../package.json'), false);
    assert.equal(isNoteName('/etc/passwd'), false);
    assert.equal(isNoteName('errors-../package.md'), false);
    assert.equal(isNoteName('readme.md'), false);
  });
});

/** 造一段正文里的记录 ID 行 */
const recordIdRow = (id: string) =>
  `<tr><td>记录 ID / 试卷 ID</td><td>${id}</td></tr>`;

/** 造一段正文里的「笔记更新时间」行 */
const updatedAtRow = (value: string) =>
  `<tr><td>笔记更新时间</td><td>${value}</td></tr>`;

/** 造一段正文里的「目标知识点」行 */
const topicRow = (value: string) =>
  `<tr><td>目标知识点</td><td>${value}</td></tr>`;

/** 文件 mtime，用作正文缺字段时的兜底 */
const MTIME = '2026-11-10T00:00:00.000Z';

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
      noteCategoryKey(recordIdRow('grammar:foo'), 'errors-foo.md'),
      'grammar',
    );
  });

  it('正文缺失时回落到文件名', () => {
    assert.equal(noteCategoryKey('', 'usage-a-b.md'), 'usage');
  });
});

describe('从正文解析目标知识点', () => {
  it('取出基础信息表里的那一格', () => {
    assert.equal(
      noteTopic(topicRow('out west 不是 outwest')),
      'out west 不是 outwest',
    );
  });

  it('没有该字段时返回空串', () => {
    assert.equal(noteTopic('## 讲解'), '');
  });
});

describe('笔记更新时间', () => {
  it('优先用正文里的时间，并转成 ISO', () => {
    assert.equal(
      noteUpdatedAt(updatedAtRow('2026-11-08 14:39'), MTIME),
      new Date('2026-11-08T14:39:00').toISOString(),
    );
  });

  it('正文没有该字段时回落到文件 mtime', () => {
    assert.equal(noteUpdatedAt('## 讲解', MTIME), MTIME);
  });

  it('正文时间解析不出来时同样回落 mtime，不给 1970 年', () => {
    assert.equal(noteUpdatedAt(updatedAtRow('不是时间'), MTIME), MTIME);
  });
});

/** 造一段笔记正文：记录 ID / 目标知识点 / 笔记更新时间三行基础信息表 */
const noteText = (id: string, topic: string, updatedAt: string) =>
  [
    '<table>',
    `<tr><td>记录 ID / 试卷 ID</td><td>${id}</td></tr>`,
    `<tr><td>目标知识点</td><td>${topic}</td></tr>`,
    `<tr><td>笔记更新时间</td><td>${updatedAt}</td></tr>`,
    '</table>',
  ].join('\n');

describe('列表摘要', () => {
  it('只回摘要：不带正文，分类 / 知识点 / 更新时间已解析，按时间倒序', async () => {
    const repo = await mkdtemp(path.join(tmpdir(), 'my-dashboard-notes-'));
    const notesDir = path.join(repo, 'learning-record-notes');

    await mkdir(notesDir);
    await writeFile(
      path.join(notesDir, 'errors-a.md'),
      noteText('errors:a', 'a vs the', '2026-11-08 14:39'),
      'utf8',
    );
    await writeFile(
      path.join(notesDir, 'usage-b.md'),
      noteText('usage:b', '', '2026-11-07 09:00'),
      'utf8',
    );

    try {
      const summaries = await collectNoteSummaries(repo);

      assert.equal(summaries.length, 2);

      const [first] = summaries;

      // 列表接口只发摘要：正文不能再混进来（否则首屏又得陪着几百篇正文一起下载）
      assert.equal('content' in first, false);
      assert.equal(first.name, 'errors-a.md');
      assert.equal(first.categoryKey, 'errors');
      assert.equal(first.topic, 'a vs the');
      assert.equal(
        first.updatedAt,
        new Date('2026-11-08T14:39:00').toISOString(),
      );
      // 正文时间新的在前，与列表页「新的在上」一致
      assert.deepEqual(
        summaries.map((summary) => summary.name),
        ['errors-a.md', 'usage-b.md'],
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });
});
