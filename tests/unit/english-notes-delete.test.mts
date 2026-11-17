import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { deleteNote } from '../../scripts/vite/english-notes-delete.ts';

/**
 * 造一个临时「记录仓库」，里面放一份假的删除脚本。
 *
 * 真脚本在 `../learn-english` 里，一跑就会真的改记录库，单测不能碰它；假脚本只回
 * 指定的 stdout / stderr，用来测中间件这边的命令拼装与结果收敛。
 */
const makeRepo = async (body: string): Promise<string> => {
  const repo = await mkdtemp(path.join(tmpdir(), 'my-dashboard-delete-'));
  const script = path.join(
    repo,
    'learn-from-english',
    'scripts',
    'learning_records.py',
  );

  await mkdir(path.dirname(script), { recursive: true });
  await writeFile(script, body, 'utf8');

  return repo;
};

/** 一次删除的入参：仓库相对笔记路径（笔记目录 + 分类 + 文件名） */
const NOTE = 'learning-record-notes/errors/errors-a.md';

/** 一份正常的脚本输出 */
const scriptPayload = (record: unknown, extra: object = {}): object => ({
  note: 'learning-record-notes/errors/errors-a.md',
  note_deleted: true,
  record: record,
  record_error: null,
  record_id: 'errors:a',
  ...extra,
});

/** 把 JS 值转成脚本里 `json.loads(...)` 能读的字面量（两侧都是 JSON 字符串） */
const literal = (value: unknown): string => JSON.stringify(JSON.stringify(value));

/** 假脚本：把给定对象打到 stdout */
const printing = (payload: unknown): string =>
  [
    'import json',
    `payload = json.loads(${literal(payload)})`,
    'print(json.dumps(payload))',
    '',
  ].join('\n');

/** 假脚本：按 argparse 的写法报错并返回退出码 2 */
const failing = (reason: string): string =>
  [
    'import sys',
    'print("usage: learning_records.py [-h] ...", file=sys.stderr)',
    `print("learning_records.py: error: ${reason}", file=sys.stderr)`,
    'sys.exit(2)',
    '',
  ].join('\n');

/** 假脚本：直接往 stdout 写一段非 JSON */
const garbage = (): string => ['print("<not json>")', ''].join('\n');

/** 删掉临时仓库 */
const cleanup = async (repo: string): Promise<void> => {
  await rm(repo, { force: true, recursive: true });
};

describe('删除笔记：调用记录仓库的脚本', () => {
  it('正常删除时把记录与改动文件收敛出来', async () => {
    const repo = await makeRepo(
      printing(
        scriptPayload({
          category: 'errors',
          file: 'learning-records/errors.json',
          id: 'errors:a',
          mastered: false,
          status: 'learning',
          title: 'a 的错题',
        }),
      ),
    );

    try {
      const deleted = await deleteNote(repo, NOTE);

      assert.deepEqual(deleted, {
        record: {
          file: 'learning-records/errors.json',
          id: 'errors:a',
          mastered: false,
        },
      });
    } finally {
      await cleanup(repo);
    }
  });

  it('记录没删成时把原因原样带回，record 为 null', async () => {
    const repo = await makeRepo(
      printing(
        scriptPayload(null, {
          record_error:
            '记录 ID 与笔记文件不一致，已保留记录只删笔记：errors:other',
        }),
      ),
    );

    try {
      const deleted = await deleteNote(repo, NOTE);

      assert.equal(deleted.record, null);
      assert.match(deleted.recordError ?? '', /记录 ID 与笔记文件不一致/u);
    } finally {
      await cleanup(repo);
    }
  });

  it('笔记路径按笔记目录拼成仓库相对路径再交给脚本', async () => {
    const expected = [
      'delete-note',
      '--note',
      'learning-record-notes/errors/errors-a.md',
    ];
    // 假脚本自己核对参数：拼错了就退出 2，测试里会看到那条说明
    const expectedArgv = literal(expected);
    const probePayload = literal(scriptPayload(null, { record_id: '' }));
    const repo = await makeRepo(
      [
        'import json',
        'import sys',
        `expected = json.loads(${expectedArgv})`,
        'if sys.argv[1:] != expected:',
        '    print("learning_records.py: error: bad argv " + str(sys.argv[1:]), file=sys.stderr)',
        '    sys.exit(2)',
        `payload = json.loads(${probePayload})`,
        'print(json.dumps(payload))',
        '',
      ].join('\n'),
    );

    try {
      const deleted = await deleteNote(repo, NOTE);

      assert.equal(deleted.record, null);
    } finally {
      await cleanup(repo);
    }
  });

  it('脚本报错时把 stderr 最后一行的原因翻成一句话', async () => {
    const repo = await makeRepo(
      failing('note does not exist: errors/errors-a.md'),
    );

    try {
      await assert.rejects(
        deleteNote(repo, NOTE),
        /note does not exist: errors\/errors-a\.md/u,
      );
    } finally {
      await cleanup(repo);
    }
  });

  it('脚本没确认删除时按失败处理', async () => {
    const repo = await makeRepo(
      printing(scriptPayload(null, { note_deleted: false })),
    );

    try {
      await assert.rejects(
        deleteNote(repo, NOTE),
        /没有确认这次删除/u,
      );
    } finally {
      await cleanup(repo);
    }
  });

  it('stdout 不是 JSON 时不当成成功', async () => {
    const repo = await makeRepo(garbage());

    try {
      await assert.rejects(
        deleteNote(repo, NOTE),
        /没有返回可读的结果/u,
      );
    } finally {
      await cleanup(repo);
    }
  });

  it('记录删掉了却没回文件路径时按失败处理，不静默少提交一份文件', async () => {
    const repo = await makeRepo(
      printing(scriptPayload({ id: 'errors:a', status: 'mastered' })),
    );

    try {
      await assert.rejects(
        deleteNote(repo, NOTE),
        /没有告诉改的是哪份文件/u,
      );
    } finally {
      await cleanup(repo);
    }
  });
});
