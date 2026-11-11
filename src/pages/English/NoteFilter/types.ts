import type { NoteFilterScope } from '../types';

/** 一个范围选项：面板上的一行单选框 */
export type NoteFilterScopeOption = {
  /** 存进 localStorage 的值 */
  value: NoteFilterScope;
  /** 单选框文案 */
  label: string;
  /** 这一档藏掉了什么：写在单选框下面，省得点开才发现内容变少 */
  description: string;
};

/** 筛选面板的入参：条件由页面持有（要持久化），面板只负责展示与回传 */
export type NoteFilterProps = {
  /** 当前范围 */
  scope: NoteFilterScope;
  /** 当前关键词 */
  keyword: string;
  /** 换范围 */
  onScopeChange: (scope: NoteFilterScope) => void;
  /** 改关键词 */
  onKeywordChange: (keyword: string) => void;
  /** 清空条件 */
  onReset: () => void;
};
