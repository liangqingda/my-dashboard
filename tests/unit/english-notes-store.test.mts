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

/** 合法的笔记路径：`<category>/<category>-<slug>.md`，目录与文件名前缀一致，slug 只用小写 ASCII */
const LEGAL = [
  'errors/errors-wait-missing-preposition-for.md',
  'vocabulary/vocabulary-headquarters.md',
  'phrases/phrases-dish-out.md',
  'grammar/grammar-modal-verb-base-form.md',
  'usage/usage-cannot-vs-cant.md',
  'paper/paper-cet6-2026-11.md',
];

/** 不合法的路径：中文、大写、下划线、目录与前缀不一致、缺少分类目录，以及路径穿越写法 */
const ILLEGAL = [
  'errors/errors-wait-后遗漏介词-for.md',
  'grammar/grammar-情态动词后使用动词原形.md',
  'errors/errors-Foo-Bar.md',
  'errors/errors-foo_bar.md',
  'errors/headquarters.md',
  'errors/errors-foo.json',
  'errors/readme.md',
  'errors/grammar-foo.md',
  'errors-foo.md',
  'categories.json',
  '../package.json',
  '/etc/passwd',
  'errors/../package.md',
  'errors/errors -foo.md',
];

describe('笔记文件名校验', () => {
  it('接受与记录仓库同口径的分类目录 + ASCII 文件名', () => {
    for (const name of LEGAL) {
      assert.equal(isNoteName(name), true, name);
    }
  });

  it('拒绝中文 slug，避免预览层放行源仓库已拒收的文件名', () => {
    assert.equal(isNoteName('errors/errors-wait-后遗漏介词-for.md'), false);
    assert.equal(isNoteName('grammar/grammar-情态动词后使用动词原形.md'), false);
  });

  it('拒绝大写、下划线、缺少分类前缀与非 Markdown 文件', () => {
    assert.equal(isNoteName('errors/errors-Foo-Bar.md'), false);
    assert.equal(isNoteName('errors/errors-foo_bar.md'), false);
    assert.equal(isNoteName('errors/headquarters.md'), false);
    assert.equal(isNoteName('errors/errors-foo.json'), false);
  });

  it('拒绝目录与文件名前缀不一致，以及旧版平铺路径', () => {
    assert.equal(isNoteName('errors/grammar-foo.md'), false);
    assert.equal(isNoteName('errors-foo.md'), false);
  });

  it('拒绝路径穿越与目录说明文件', () => {
    assert.equal(isNoteName('../package.json'), false);
    assert.equal(isNoteName('/etc/passwd'), false);
    assert.equal(isNoteName('errors/../package.md'), false);
    assert.equal(isNoteName('errors/readme.md'), false);
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

    await mkdir(path.join(notesDir, 'errors'), { recursive: true });
    await mkdir(path.join(notesDir, 'usage'), { recursive: true });
    await writeFile(
      path.join(notesDir, 'errors', 'errors-a.md'),
      noteText('errors:a', 'a vs the', '2026-11-08 14:39'),
      'utf8',
    );
    await writeFile(
      path.join(notesDir, 'usage', 'usage-b.md'),
      noteText('usage:b', '', '2026-11-07 09:00'),
      'utf8',
    );

    try {
      const summaries = await collectNoteSummaries(repo);

      assert.equal(summaries.length, 2);

      const [first] = summaries;

      // 列表接口只发摘要：正文不能再混进来（否则首屏又得陪着几百篇正文一起下载）
      assert.equal('content' in first, false);
      assert.equal(first.name, 'errors/errors-a.md');
      assert.equal(first.categoryKey, 'errors');
      assert.equal(first.topic, 'a vs the');
      assert.equal(
        first.updatedAt,
        new Date('2026-11-08T14:39:00').toISOString(),
      );
      // 正文时间新的在前，与列表页「新的在上」一致
      assert.deepEqual(
        summaries.map((summary) => summary.name),
        ['errors/errors-a.md', 'usage/usage-b.md'],
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('基础信息表在文件头之外时回落整读，摘要照样正确', async () => {
    const repo = await mkdtemp(path.join(tmpdir(), 'my-dashboard-notes-'));
    const notesDir = path.join(repo, 'learning-record-notes');

    await mkdir(path.join(notesDir, 'paper'), { recursive: true });
    // 20KB 的单行前导把基础信息表顶到文件头之外：只读文件头会连一个字段都取不到
    const padding = 'x'.repeat(20 * 1024);
    await writeFile(
      path.join(notesDir, 'paper', 'paper-cet6.md'),
      `${padding}\n${noteText('paper:cet6', '套题复盘', '2026-11-09 08:00')}`,
      'utf8',
    );

    try {
      const summaries = await collectNoteSummaries(repo);

      assert.equal(summaries.length, 1);

      const [summary] = summaries;

      assert.equal(summary.name, 'paper/paper-cet6.md');
      assert.equal(summary.categoryKey, 'paper');
      assert.equal(summary.topic, '套题复盘');
      assert.equal(
        summary.updatedAt,
        new Date('2026-11-09T08:00:00').toISOString(),
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('文件头被截断但信息表完整落在里面时，直接用文件头解析', async () => {
    const repo = await mkdtemp(path.join(tmpdir(), 'my-dashboard-notes-'));
    const notesDir = path.join(repo, 'learning-record-notes');

    await mkdir(path.join(notesDir, 'grammar'), { recursive: true });
    // 信息表在最前面，正文主体把文件顶过 16KB：截断的是正文，不是摘要字段
    await writeFile(
      path.join(notesDir, 'grammar', 'grammar-long.md'),
      `${noteText('grammar:long', '长笔记', '2026-11-10 10:00')}\n${'x'.repeat(
        20 * 1024,
      )}`,
      'utf8',
    );

    try {
      const summaries = await collectNoteSummaries(repo);

      assert.equal(summaries.length, 1);

      const [summary] = summaries;

      assert.equal(summary.categoryKey, 'grammar');
      assert.equal(summary.topic, '长笔记');
      assert.equal(
        summary.updatedAt,
        new Date('2026-11-10T10:00:00').toISOString(),
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });
});
