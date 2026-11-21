import type { MarkdownFilterNavigation } from '@/components/modals/MarkdownPreviewModal';

import type { NoteFilterScope } from '../types';

/** 一个范围选项：面板上的一行单选框 */
export type NoteFilterScopeOption = {
  /** 存进 localStorage 的值 */
  value: NoteFilterScope;
  /** 单选框文案 */
  label: string;
  /** 选中的这一档到底筛掉什么，靠这句单行说明补上 */
  description: string;
};

/** 筛选面板的入参：条件由页面持有（要持久化），面板只负责展示与回传 */
export type NoteFilterProps = {
  /** 当前范围 */
  scope: NoteFilterScope;
  /** 当前关键词 */
  keyword: string;
  /** 关键词匹配导航；无关键词 / 无匹配 / 非预览态时为 null */
  navigation: MarkdownFilterNavigation | null;
  /** 换范围 */
  onScopeChange: (scope: NoteFilterScope) => void;
  /** 改关键词 */
  onKeywordChange: (keyword: string) => void;
  /** 清空条件 */
  onReset: () => void;
};
