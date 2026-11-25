/**
 * 预览列表的通用状态：某一类文件（视频 / 图片）的列表、正在预览哪一条、开 / 关 / 切换。
 *
 * 视频与图片预览的差异（截图、显示偏好）留在各自 hook 里，这里只管「列表 + 选中项」，
 * 免得两份几乎一样的 useMemo + 派生选中项各写一遍。
 *
 * 正在预览的这一条**在弹窗里被删掉**时，不是直接关窗，而是顺着原位切到下一条（末尾删掉则回到上一条）；
 * 只有列表里一条都不剩才关窗。换目录不算删除——那是另一回事，照旧关窗。
 */

import { useMemo, useState } from 'react';

import type { DirListing, FileCategory, FileEntry } from '../types';

/** 预览列表 hook 的返回 */
export type PreviewListResult = {
  /** 当前目录里的这一类文件（按文件名顺序，翻篇与侧栏都用它） */
  items: FileEntry[];
  /** 正在预览的路径；null 表示弹层关着（或选中项已不在列表里） */
  activeId: string | null;
  /** 打开某一条 */
  open: (file: FileEntry) => void;
  /** 切到另一条（翻篇与侧栏点选都走它） */
  select: (id: string) => void;
  /** 关闭预览 */
  close: () => void;
  /** 预览中的这一条被删掉：切到下一条（没有了就关窗） */
  skipDeleted: (path: string) => void;
};

/**
 * 管理某一类文件的预览选中状态。
 *
 * @param listing 当前目录清单；换目录后旧条目自然不在列表里，预览随之关闭
 * @param category 预览的文件分类（video / image）
 */
export const usePreviewList = (
  listing: DirListing | null,
  category: FileCategory,
): PreviewListResult => {
  const [activeId, setActiveId] = useState<string | null>(null);

  /** 列表只在清单或分类变化时重算 */
  const items = useMemo(
    () => (listing?.files ?? []).filter((file) => file.category === category),
    [category, listing],
  );

  /**
   * 预览中的这一条刚被删掉：先替它选好下一条（原位置的下一条，末尾删掉则回到上一条），
   * 列表里一条都不剩就关窗。由删除流程在重读列表**之前**调——那时旧的顺序还在，
   * 位置一定找得到；等重读完再算，删掉的那一条已经不见了，只能凭记忆猜。
   */
  const skipDeleted = (path: string) => {
    if (activeId !== path) {
      return;
    }

    const at = items.findIndex((file) => file.path === path);
    // `at()` 越界会给 undefined（下标访问在类型上是非空，得靠它兜住首尾）
    const fallback = items.at(at + 1) ?? items.at(at - 1) ?? null;

    setActiveId(fallback === null ? null : fallback.path);
  };

  return {
    activeId:
      activeId !== null && items.some((file) => file.path === activeId)
        ? activeId
        : null,
    close: () => setActiveId(null),
    items,
    open: (file: FileEntry) => setActiveId(file.path),
    select: (id: string) => setActiveId(id),
    skipDeleted,
  };
};
