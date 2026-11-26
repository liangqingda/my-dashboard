/**
 * 「刚搬进某个文件夹的条目」这一份清单：弹窗里那一格据此把本次搬进去的条目平铺出来，
 * 点一下把它们搬回原来的目录、并交回待拖拽区（那一格留成虚位）。
 *
 * 单独成 hook：会话状态机（`index.ts`）只关心「搬了几个、要不要关窗」，
 * 这份回流的记录跟它没有关系，放在一起会把那个文件撑过行数上限。
 */

import { useRef, useState } from 'react';

import { joinDirOf } from '../../utils/files';
import type { DraggableEntry } from '../../types';

import type { LandedItem, UseLandedArgs } from './types';
import { buildLanded } from './utils';

/** 还没有记录时共用一个空数组，免得每次渲染都造一个新的 */
const NO_ITEMS: LandedItem[] = [];

/** 搬进某格的记录 + 撤回 */
export const useLanded = ({ moveEntry, onReadd }: UseLandedArgs) => {
  const [items, setItems] = useState<LandedItem[]>(NO_ITEMS);
  /** 状态镜像：撤回时要读到「此刻」的那一条，不能依赖某一次渲染的闭包 */
  const itemsRef = useRef<LandedItem[]>(NO_ITEMS);

  const commit = (next: LandedItem[]) => {
    itemsRef.current = next;
    setItems(next);
  };

  /** 记下这一趟搬成功的：只留搬成功的，路径换成新目录下的同名路径 */
  const remember = (
    entries: DraggableEntry[],
    movedPaths: string[],
    targetDir: string,
    origin: string,
  ) => {
    const added = buildLanded(entries, movedPaths, targetDir, origin);

    if (added.length === 0) {
      return;
    }

    commit([...itemsRef.current, ...added]);
  };

  /** 新的会话开始：上一次的记录跟着清掉 */
  const reset = () => commit([]);

  /** 点「刚搬进来的」那一条：搬回原目录，条目交回待拖拽区，这一格留成虚位 */
  const retract = async (id: string): Promise<void> => {
    const item = itemsRef.current.find((record) => record.id === id);

    if (item === undefined || item.retracted) {
      return;
    }

    const moved = await moveEntry(item.entry.path, item.origin);

    if (!moved) {
      return;
    }

    commit(
      itemsRef.current.map((record) =>
        record.id === id ? { ...record, retracted: true } : record,
      ),
    );
    onReadd?.({ ...item.entry, path: joinDirOf(item.origin, item.entry.name) });
  };

  return { items, remember, reset, retract };
};
