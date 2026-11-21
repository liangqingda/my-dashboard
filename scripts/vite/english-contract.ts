/**
 * 记录仓库的定位、契约期望值与契约核对：笔记与知识库两个插件共用这一份。
 *
 * 期望值必须只有一处来源：两个插件各自拼一遍，改契约时总会漏掉一边，
 * 于是「笔记能读、知识库报错」这种半坏状态就会出现。这里按各模块的真实常量组装。
 */

import path from 'node:path';

import { assertContract } from './english-notes-contract.js';
import type { RepoExpectation } from './english-notes-contract.js';
import { DELETE_SCRIPT } from './english-notes-delete.js';
import { CATEGORY_CONFIG_FILE, NOTES_DIR } from './english-notes-store.js';
import { NOTE_SCRIPT } from './english-notes-write.js';
import { RECORD_SCRIPT } from './english-records-delete.js';
import { MASTERED_RECORDS_DIR, RECORDS_DIR } from './english-records-store.js';

/** 记录仓库默认取与本项目同级的目录名 */
const DEFAULT_REPO_DIR = 'learn-english';

/**
 * 记录仓库根目录：默认 `../learn-english`，可用环境变量 `ENGLISH_RECORDS_DIR` 指定其它路径。
 */
export const repoDirOf = (root: string): string =>
  path.resolve(
    process.env.ENGLISH_RECORDS_DIR ?? path.join(root, '..', DEFAULT_REPO_DIR),
  );

/**
 * 本项目对记录仓库的要求：`contract.json` 必须与这套值逐项一致。
 * 各值都来自对应模块的真实常量，这里只做组装，不再抄第二份。
 */
export const REPO_EXPECTATION: RepoExpectation = {
  categoriesFile: `${NOTES_DIR}/${CATEGORY_CONFIG_FILE}`,
  deleteNote: { args: ['delete-note'], script: DELETE_SCRIPT },
  deleteRecord: { args: ['delete-record'], script: RECORD_SCRIPT },
  masteredRecordsDir: MASTERED_RECORDS_DIR,
  notesDir: NOTES_DIR,
  python: 'python3',
  recordsDir: RECORDS_DIR,
  writeNote: { args: ['write'], script: NOTE_SCRIPT },
};

/**
 * 核对记录仓库契约，返回不一致的原因；一致返回 null。
 *
 * 每次请求都读一遍：契约文件只有几行，比一次读盘便宜得多，换来的是记录仓库那边
 * 改契约后页面立刻报差异，而不是等下次重启才发现。
 */
export const contractIssue = async (repoDir: string): Promise<string | null> => {
  try {
    await assertContract(repoDir, REPO_EXPECTATION);

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '记录仓库契约核对失败';
  }
};
