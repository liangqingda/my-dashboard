/**
 * 快捷命令的分组归类：按 `group` 字段归堆，再按固定顺序出分组。
 */

import type { CliCommand } from '@/services/types';

import { GROUP_LABELS, GROUP_ORDER } from '../constants';

/** 一个分组：固定顺序里排在前面的分组先出，空组被滤掉 */
export type CliCommandGroup = {
  /** 分组 key（与 `CliCommand.group` 对应） */
  key: string;
  /** 分组标题 */
  label: string;
  /** 这一组的命令，保持接口返回的顺序 */
  items: CliCommand[];
};

/** 按分组名把命令归堆：一次遍历建 Map，避免每个分组各扫一遍全量命令 */
export const groupCommands = (commands: CliCommand[]): CliCommandGroup[] => {
  const byGroup = new Map<string, CliCommand[]>();

  for (const command of commands) {
    const bucket = byGroup.get(command.group) ?? [];

    bucket[bucket.length] = command;
    byGroup.set(command.group, bucket);
  }

  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABELS[key],
    items: byGroup.get(key) ?? [],
  })).filter((group) => group.items.length > 0);
};
