/**
 * 「本次会话搬进某个文件夹的条目」这一份清单：
 * 弹窗里进到那个文件夹后，把它们按列表里的样子摆出来（见 `DragMoveModal/LandedTiles`），
 * 点一下就把它们从记录里取回、放回手卡（不动磁盘，文件本来就留在这个文件夹里）。
 *
 * 单独成 hook：会话状态机（`index.ts`）只关心「搬了几个、要不要关窗」，
 * 这份记录跟它没有关系，放在一起会把那个文件撑过行数上限。
 */

import { useRef, useState } from 'react';

import type { DraggableEntry } from '../../types';

import type { LandedItem } from './types';
import { buildLanded } from './utils';

/** 还没有记录时共用一个空数组，免得每次渲染都造一个新的 */
const NO_ITEMS: LandedItem[] = [];

/** 搬进某格的记录 + 取回 */
export const useLanded = () => {
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

  /** 某一条被取回去了：从记录里摘掉（那个文件夹里就看不到它了） */
  const forget = (id: string) => {
    commit(itemsRef.current.filter((record) => record.id !== id));
  };

  return { forget, items, remember, reset };
};
