import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { deleteLearningRecord } from '../../scripts/vite/english-notes-records.ts';
import { deleteNote, noteRecordId } from '../../scripts/vite/english-notes-store.ts';

/** 造一段带记录 ID 的笔记正文（只有删除要读的那一行） */
const noteText = (id: string): string =>
  [
    '## 基础信息',
    '',
    '<table>',
    `<tr><td>记录 ID / 试卷 ID</td><td>${id}</td></tr>`,
    '</table>',
    '',
    '## 讲解',
    '',
  ].join('\n');

/** 建一个临时记录仓库 */
const makeRepo = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), 'my-dashboard-delete-'));

/** 写一份 JSON：与仓库脚本同一形态（缩进两格 + 结尾换行） */
const writeJson = async (file: string, data: unknown): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

/** 静默判断文件是否还在 */
const exists = async (file: string): Promise<boolean> => {
  try {
    await stat(file);

    return true;
  } catch {
    return false;
  }
};

/** 一份未掌握记录文件（对象形态） */
const learningDatabase = (
  records: Record<string, unknown>,
  revision = 7,
): Record<string, unknown> => ({
  schema_version: 2,
  revision,
  category: 'errors',
  records,
});

/** 一条最小可用记录 */
const record = (id: string, title: string): Record<string, unknown> => ({
  id,
  category: 'errors',
  key: id.slice(id.indexOf(':') + 1),
  status: 'learning',
  title,
});

describe('笔记的记录 ID', () => {
  it('从正文基础信息表里取出来', () => {
    assert.equal(noteRecordId(noteText('errors:a-b')), 'errors:a-b');
  });

  it('没有基础信息表时返回空串（这种笔记只有 md 可删）', () => {
    assert.equal(noteRecordId('## 讲解\n\n没有基础信息表'), '');
  });
});

describe('删除笔记 md', () => {
  it('删掉源文件，并把记录 ID 交出来', async () => {
    const repo = await makeRepo();
    const file = path.join(
      repo,
      'learning-record-notes',
      'errors',
      'errors-a.md',
    );

    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, noteText('errors:a'), 'utf8');

    try {
      const deleted = await deleteNote(repo, 'errors/errors-a.md');

      assert.equal(deleted.recordId, 'errors:a');
      assert.equal(await exists(file), false);
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('路径不合法时直接拒绝，不碰别的文件', async () => {
    const repo = await makeRepo();

    try {
      await assert.rejects(
        deleteNote(repo, '../package.json'),
        /这个文件不允许删除/u,
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('文件已经不在了时给出人话原因，而不是 ENOENT', async () => {
    const repo = await makeRepo();

    try {
      await assert.rejects(
        deleteNote(repo, 'errors/errors-gone.md'),
        /这篇笔记已经不在了/u,
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });
});

describe('删除学习记录', () => {
  it('未掌握库是对象形态：只删这一条，revision 加一，别的记录不动', async () => {
    const repo = await makeRepo();
    const file = path.join(repo, 'learning-records', 'errors.json');

    await writeJson(
      file,
      learningDatabase({
        'errors:a': record('errors:a', 'a 的错题'),
        'errors:b': record('errors:b', 'b 的错题'),
      }),
    );

    try {
      const deleted = await deleteLearningRecord(repo, 'errors:a');

      assert.deepEqual(deleted, {
        file: 'learning-records/errors.json',
        id: 'errors:a',
        mastered: false,
      });

      const saved = JSON.parse(await readFile(file, 'utf8')) as {
        revision: number;
        records: Record<string, unknown>;
      };

      assert.equal(saved.revision, 8);
      assert.deepEqual(Object.keys(saved.records), ['errors:b']);
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('未掌握库没有这条时去已掌握库：数组形态只少一条', async () => {
    const repo = await makeRepo();

    await writeJson(
      path.join(repo, 'learning-records', 'errors.json'),
      learningDatabase({ 'errors:other': record('errors:other', '别的错题') }),
    );
    await writeJson(
      path.join(repo, 'mastered-learning-records', 'errors.json'),
      [
        { id: 'errors:a', title: 'a 的错题', mastered_at: '2026-07-30T16:43:44+08:00' },
        { id: 'errors:b', title: 'b 的错题', mastered_at: '2026-07-31T16:43:44+08:00' },
      ],
    );

    try {
      const deleted = await deleteLearningRecord(repo, 'errors:a');

      assert.deepEqual(deleted, {
        file: 'mastered-learning-records/errors.json',
        id: 'errors:a',
        mastered: true,
      });

      const saved = JSON.parse(
        await readFile(path.join(repo, 'mastered-learning-records', 'errors.json'), 'utf8'),
      ) as { id: string }[];

      // 数组形态写回时仍是数组，只少这一条
      assert.deepEqual(
        saved.map((item) => item.id),
        ['errors:b'],
      );
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('两处都没有这条记录时返回 null，文件一个字节都不改', async () => {
    const repo = await makeRepo();
    const file = path.join(repo, 'learning-records', 'errors.json');
    const before = `${JSON.stringify(learningDatabase({ 'errors:b': record('errors:b', 'b') }), null, 2)}\n`;

    await writeJson(file, learningDatabase({ 'errors:b': record('errors:b', 'b') }));

    try {
      assert.equal(await deleteLearningRecord(repo, 'errors:missing'), null);
      assert.equal(await readFile(file, 'utf8'), before);
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });

  it('分类前缀不合法时不去碰任何文件', async () => {
    const repo = await makeRepo();

    try {
      assert.equal(await deleteLearningRecord(repo, '../errors:a'), null);
      assert.equal(await deleteLearningRecord(repo, 'a'), null);
    } finally {
      await rm(repo, { force: true, recursive: true });
    }
  });
});
