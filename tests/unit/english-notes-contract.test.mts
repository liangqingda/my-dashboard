import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  CONTRACT_VERSION,
  assertContract,
} from '../../scripts/vite/english-notes-contract.ts';

import type { RepoExpectation } from '../../scripts/vite/english-notes-contract.ts';

/** 与本项目实现逐项对齐的契约：校验应直接通过 */
const CONTRACT = {
  contractVersion: CONTRACT_VERSION,
  python: 'python3',
  notesDir: 'learning-record-notes',
  categoriesFile: 'learning-record-notes/categories.json',
  commands: {
    writeNote: {
      script: 'skills/take-english-study-notes/scripts/note.py',
      args: ['write'],
    },
    deleteNote: {
      script: 'skills/learn-from-english/scripts/learning_records.py',
      args: ['delete-note'],
    },
  },
};

/** 本项目使用的目录与命令：与上面那份契约同一套值，逐项比不出差异 */
const EXPECTED: RepoExpectation = {
  python: CONTRACT.python,
  notesDir: CONTRACT.notesDir,
  categoriesFile: CONTRACT.categoriesFile,
  writeNote: CONTRACT.commands.writeNote,
  deleteNote: CONTRACT.commands.deleteNote,
};

/** 造一个临时记录仓库目录，写入给定的契约内容（字符串原样写入，对象序列化） */
const makeRepo = async (content: unknown): Promise<string> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'my-dashboard-contract-'));

  await writeFile(
    path.join(dir, 'contract.json'),
    typeof content === 'string' ? content : JSON.stringify(content),
    'utf8',
  );

  return dir;
};

/** 跑一次校验并收回错误消息；通过时返回 null */
const checkMessage = async (repoDir: string): Promise<string | null> => {
  try {
    await assertContract(repoDir, EXPECTED);

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** 用给定契约跑一次校验，结束后清掉临时目录 */
const checkWith = async (content: unknown): Promise<string | null> => {
  const dir = await makeRepo(content);

  try {
    return await checkMessage(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

describe('记录仓库契约', () => {
  it('契约与本项目实现逐项对齐时不报错', async () => {
    assert.equal(await checkWith(CONTRACT), null);
  });

  it('缺少 contract.json 时直接说读不到，不用空列表冒充正常', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'my-dashboard-contract-'));

    try {
      const message = await checkMessage(dir);

      assert.match(message ?? '', /读不到记录仓库的 contract\.json/u);
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });

  it('契约版本升级后报出双方版本号', async () => {
    const message = await checkWith({
      ...CONTRACT,
      contractVersion: CONTRACT_VERSION + 1,
    });

    assert.match(message ?? '', /contractVersion（契约 v2 \/ 本项目 v1）/u);
  });

  it('版本号不是整数时当作缺失', async () => {
    const message = await checkWith({ ...CONTRACT, contractVersion: '1' });

    assert.match(message ?? '', /contractVersion（契约缺失/u);
  });

  it('目录或分类清单不一致时指名是哪个字段', async () => {
    const message = await checkWith({
      ...CONTRACT,
      categoriesFile: 'learning-record-notes/categories.yaml',
    });

    assert.match(message ?? '', /categoriesFile（契约/u);
  });

  it('写命令的脚本或子命令不一致时同样指名', async () => {
    const script = await checkWith({
      ...CONTRACT,
      commands: {
        ...CONTRACT.commands,
        writeNote: { ...CONTRACT.commands.writeNote, script: 'note.py' },
      },
    });
    const args = await checkWith({
      ...CONTRACT,
      commands: {
        ...CONTRACT.commands,
        deleteNote: {
          ...CONTRACT.commands.deleteNote,
          args: ['remove-note'],
        },
      },
    });

    assert.match(script ?? '', /commands\.writeNote\.script/u);
    assert.match(args ?? '', /commands\.deleteNote\.args（契约 remove-note /u);
  });

  it('契约不是合法 JSON 或顶层不是对象时给出结构原因', async () => {
    assert.match((await checkWith('{')) ?? '', /不是合法 JSON/u);
    assert.match((await checkWith([])) ?? '', /顶层必须是对象/u);
  });
});
