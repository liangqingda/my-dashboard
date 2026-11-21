/**
 * 预览 header 的弹层状态与快捷键：筛选 / 字号面板的开合，以及这一组快捷键的接管。
 *
 * 为什么不连弹层状态一起放这里：`panel` 先于「正文交互」被用到（开子区域预览前要收弹层），
 * 所以状态留在弹窗，这个 hook 只收现成的 `panel` / `setPanel`；筛选面板要用的命中导航
 * 由工作区回传，也一并收在这里，弹窗不必知道它是给谁用的。
 *
 * 复制（`c`）与删除（`Delete` / `Backspace`）不在这一组：它们由 `FreeModal` 按「有没有复制文本 /
 * 有没有删除请求」统一挂接，记录详情弹窗走同一套键位。
 *
 * 口径与外壳那套一致：带 ⌘ / Ctrl / Alt 的组合键放行；正在输入时不抢字符；
 * 子区域预览、删除确认层开着时停用；动作没有对应能力（没传筛选槽 / 刷新）时按键不动作。
 */

import { useCallback, useState } from 'react';

import type { MarkdownFilterNavigation } from '../types/filter';
import type { PreviewPanel } from '../types';

import { useHeaderActionShortcuts } from './useHeaderActionShortcuts';

/** header 弹层与快捷键的入参 */
export type PreviewHeaderActionsParams = {
  /** 弹窗是否打开 */
  opened: boolean;
  /** 正文是否还在取：加载中没有正文可筛、可刷新 */
  loading: boolean;
  /** 是否在编辑态（含草稿预览）：编辑态整组按钮都收掉 */
  editing: boolean;
  /** 子区域预览 / 删除确认层是否开着：那时键盘归上面那一层 */
  blocked: boolean;
  /** 有没有筛选能力（没传筛选槽就没有这个键） */
  hasFilter: boolean;
  /** 刷新动作（已包好「先收弹层」）；不传就没有刷新能力 */
  refresh: (() => void) | null;
  /** 当前打开的 header 弹层 */
  panel: PreviewPanel | null;
  /** 开合 header 弹层 */
  setPanel: (panel: PreviewPanel | null) => void;
};

/** 这个 hook 交回的状态 */
export type PreviewHeaderActionsState = {
  /** 关键词命中导航：工作区打标后回传，筛选面板挂回车切换 */
  highlightNavigation: MarkdownFilterNavigation | null;
  /** 工作区回传的命中导航（卸载 / 非预览态时回传 null） */
  setHighlightNavigation: (navigation: MarkdownFilterNavigation | null) => void;
};

/**
 * 管理 header 弹层的命中导航与 `a` / `s` / `r` 快捷键。
 *
 * @param params 弹层状态、能力开关与刷新动作（`PreviewHeaderActionsParams`）
 * @returns 命中导航与它的写入动作（`PreviewHeaderActionsState`）
 */
export const usePreviewHeaderActions = ({
  blocked,
  editing,
  hasFilter,
  loading,
  opened,
  panel,
  refresh,
  setPanel,
}: PreviewHeaderActionsParams): PreviewHeaderActionsState => {
  const [highlightNavigation, setHighlightNavigation] =
    useState<MarkdownFilterNavigation | null>(null);

  /** 快捷键开合筛选面板：已开筛选就收起，否则切到筛选（与点筛选按钮同一条路） */
  const toggleFilterPanel = useCallback(() => {
    setPanel(panel === 'filter' ? null : 'filter');
  }, [panel, setPanel]);

  /** 快捷键开合字号面板：已开字号面板就收起，否则切到字号（与点字号按钮同一条路） */
  const toggleFontPanel = useCallback(() => {
    setPanel(panel === 'font' ? null : 'font');
  }, [panel, setPanel]);

  /**
   * `a` 字号开合、`s` 筛选开合、`r` 刷新
   * （翻篇、`F` 全屏、`C` 复制与删除键在 `FreeModal` 里统一处理）。
   */
  useHeaderActionShortcuts({
    enabled: opened && !editing && !blocked,
    onToggleFont: !loading ? toggleFontPanel : null,
    onToggleFilter: hasFilter && !loading ? toggleFilterPanel : null,
    onRefresh: refresh,
  });

  return { highlightNavigation, setHighlightNavigation };
};
