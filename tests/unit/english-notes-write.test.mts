import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  describeIssues,
  writeNoteFile,
} from '../../scripts/vite/english-notes-write.ts';

/**
 * 造一个临时「记录仓库」，里面放一份假的 `note.py`。
 *
 * 真脚本在 `../learn-english` 里，一跑就会真的改笔记，单测不能碰它；假脚本只回
 * 指定 stdout / stderr，用来测中间件这边的命令拼装与结果收敛。
 */
const makeRepo = async (body: string): Promise<string> => {
  const repo = await mkdtemp(path.join(tmpdir(), 'my-dashboard-write-'));
  const script = path.join(repo, 'take-english-study-notes', 'scripts', 'note.py');

  await mkdir(path.dirname(script), { recursive: true });
  await writeFile(script, body, 'utf8');

  return repo;
};

/** 把 JS 值转成脚本里 `json.loads(...)` 能读的字面量 */
const literal = (value: unknown): string =>
  JSON.stringify(JSON.stringify(value));

/** 假脚本：回显收到的参数与正文，并按给定结果退出 */
const echoing = (payload: unknown, exitCode = 0): string =>
  [
    'import json',
    'import sys',
    'from pathlib import Path',
    `payload = json.loads(${literal(payload)})`,
    'payload["argv"] = sys.argv[1:]',
    'payload["content"] = Path(sys.argv[sys.argv.index("--content-file") + 1]).read_text(encoding="utf-8")',
    'print(json.dumps(payload))',
    `sys.exit(${exitCode})`,
    '',
  ].join('\n');

/** 一份正常写入的脚本输出 */
const accepted = (extra: object = {}): object => ({
  ok: true,
  file: 'learning-record-notes/errors/errors-a.md',
  note_status: 'valid',
  written: true,
  ...extra,
});

/** 一份被拒的脚本输出 */
const rejected = (issues: object[]): object => ({
  check: { issues: issues, ok: false },
  file: 'learning-record-notes/errors/errors-a.md',
  note_status: 'invalid',
  ok: false,
  written: false,
});

const NOTE = 'learning-record-notes/errors/errors-a.md';

const cleanup = async (repo: string): Promise<void> => {
  await rm(repo, { force: true, recursive: true });
};

describe('保存笔记：调用记录仓库的笔记脚本', () => {
  it('正常写入时把脚本的写入与校验状态收敛出来', async () => {
    const repo = await makeRepo(echoing(accepted()));

    try {
      const result = await writeNoteFile(repo, NOTE, '# 正文\n');

      assert.deepEqual(result, { status: 'valid', written: true });
    } finally {
      await cleanup(repo);
    }
  });

  it('命令按整篇写入的形式拼装，正文整篇从临时文件交给脚本', async () => {
    const body = '# 正文\n第二行\n';
    // 假脚本自己核对参数与正文：对不上就抛 AssertionError，测试里会看到失败
    const repo = await makeRepo(
      [
        'import json',
        'import sys',
        'from pathlib import Path',
        'argv = sys.argv[1:]',
        'assert argv[0] == "write", argv',
        'assert argv[1] == "--file", argv',
        `assert argv[2] == ${JSON.stringify(NOTE)}, argv`,
        'assert argv[3] == "--content-file", argv',
        'content = Path(argv[4]).read_text(encoding="utf-8")',
        `assert content == json.loads(${literal(body)}), repr(content)`,
        `print(json.dumps(json.loads(${literal(accepted())})))`,
        '',
      ].join('\n'),
    );

    try {
      const result = await writeNoteFile(repo, NOTE, body);

      assert.equal(result.written, true);
    } finally {
      await cleanup(repo);
    }
  });

  it('校验未通过时把问题行拼进报错，并说明已撤销保存', async () => {
    const repo = await makeRepo(
      echoing(
        rejected([
          { line: 12, message: '轮次信息表必须写在 `## 本轮习题` 之下' },
          { line: 30, message: '必须有题目' },
        ]),
        1,
      ),
    );

    try {
      await assert.rejects(
        writeNoteFile(repo, NOTE, '# 正文\n'),
        /笔记校验未通过，已撤销保存。第 12 行：轮次信息表/u,
      );
    } finally {
      await cleanup(repo);
    }
  });

  it('脚本直接报错（没有校验问题）时用 stderr 里 error 的原话', async () => {
    // 真脚本走 `fail()`：JSON 打到 stderr，进程以 1 退出
    const repo = await makeRepo(
      [
        'import json',
        'import sys',
        `error = ${JSON.stringify('note path must live under learning-record-notes/<category>/')}`,
        'print(json.dumps({"error": error, "ok": False}), file=sys.stderr)',
        'sys.exit(1)',
        '',
      ].join('\n'),
    );

    try {
      await assert.rejects(
        writeNoteFile(repo, 'README.md', '# 正文\n'),
        /note path must live under learning-record-notes/u,
      );
    } finally {
      await cleanup(repo);
    }
  });
});

describe('校验问题的排版', () => {
  it('最多展示三条，其余折成一句总数', () => {
    const issues = [
      { line: 3, message: 'a' },
      { line: 8, message: 'b' },
      { line: 12, message: 'c' },
      { line: 20, message: 'd' },
      { message: 'e' },
    ];

    assert.equal(
      describeIssues(issues),
      '第 3 行：a；第 8 行：b；第 12 行：c（另有 2 处问题）',
    );
  });

  it('没有行号时只给说明', () => {
    assert.equal(describeIssues([{ line: 0, message: '整篇缺少讲解' }]), '整篇缺少讲解');
  });
});
