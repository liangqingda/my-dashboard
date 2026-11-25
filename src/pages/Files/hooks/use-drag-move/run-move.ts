/**
 * 逐条提交移动（不并发）：慢盘（外接硬盘）上一条可能要几秒，界面要看得见进度，
 * 所以按 `done / total` 一档一档往上走；成功一条才算一条，失败立刻停手。
 *
 * 单拆一份是为了不把「一串异步」塞进会话状态机里：这里只管顺序与进度，成败后的界面语义归 `useDragMove`。
 */

import type { MoveProgress } from './types';

type RunSequentialMoveArgs = {
  /** 要搬的源路径（顺序即列表顺序） */
  sources: string[];
  /** 搬到哪个目录 */
  targetDir: string;
  /** 搬一条：`moveEntry` 那一层已经把失败弹成通知，这里只要真假 */
  moveOne: (source: string, targetDir: string) => Promise<boolean>;
  /** 每搬完一条推一档进度（开始搬第一条前先推 0） */
  onProgress: (progress: MoveProgress) => void;
};

/**
 * 依次搬完 `sources`，返回真正搬成功的那串（可能比 `sources` 短）。
 * 用自递归而不是 `for-await`：顺序执行的意图一样，但不必在循环里 await。
 */
const step = async (
  sources: string[],
  index: number,
  done: string[],
  args: RunSequentialMoveArgs,
): Promise<string[]> => {
  if (index >= sources.length) {
    return done;
  }

  const source = sources[index];

  const ok = await args.moveOne(source, args.targetDir);

  if (!ok) {
    return done;
  }

  const succeeded = [...done, source];

  args.onProgress({
    current: source,
    done: succeeded.length,
    targetDir: args.targetDir,
    total: sources.length,
  });

  return step(sources, index + 1, succeeded, args);
};

export const runSequentialMove = async (
  args: RunSequentialMoveArgs,
): Promise<string[]> => {
  args.onProgress({
    current: args.sources[0] ?? '',
    done: 0,
    targetDir: args.targetDir,
    total: args.sources.length,
  });

  return step(args.sources, 0, [], args);
};
