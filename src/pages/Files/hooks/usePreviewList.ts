/**
 * 预览列表的通用状态：某一类文件（视频 / 图片）的列表、正在预览哪一条、开 / 关 / 切换。
 *
 * 视频与图片预览的差异（截图、显示偏好）留在各自 hook 里，这里只管「列表 + 选中项」，
 * 免得两份几乎一样的 useMemo + 派生选中项各写一遍。
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
   * 条目已经不在列表里（删除、换目录）就按「没在预览」处理：
   * 地址指向已删文件时浏览器只会报错，留着弹层没有意义。
   * 在读时算派生值，不拿 effect 回写状态——否则每删一条都要多渲染一轮。
   */
  const activeItemId =
    activeId !== null && items.some((file) => file.path === activeId)
      ? activeId
      : null;

  return {
    activeId: activeItemId,
    close: () => setActiveId(null),
    items,
    open: (file: FileEntry) => setActiveId(file.path),
    select: (id: string) => setActiveId(id),
  };
};
