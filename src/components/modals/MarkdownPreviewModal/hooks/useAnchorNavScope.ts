/**
 * 子区域预览的前后切换口径：`all` 切换全文所有链接指向的区块，
 * `section` 只切换同一处目录里的那几个链接（计数就是这一处的链接数）。
 *
 * 与「点击行为」一样是「怎么看链接」的偏好，不属于某一篇：记在 localStorage，
 * 换篇、关掉重开、刷新页面后都保持上次的样子；存储值不在枚举里（改版、被手工改坏）
 * 时由 `createChoiceCodec` 回落默认（切换全文）。
 */

import { useStoredState } from '@/hooks/useStoredState';
import { createChoiceCodec } from '@/utils/local-storage';

import type { AnchorNavScope } from '../types';
import {
  ANCHOR_NAV_SCOPES,
  ANCHOR_NAV_SCOPE_STORAGE_KEY,
  DEFAULT_ANCHOR_NAV_SCOPE,
} from '../constants';

/** 存两种口径之一：缺失或不在枚举里都回落默认 */
const SCOPE_CODEC = createChoiceCodec(
  ANCHOR_NAV_SCOPES,
  DEFAULT_ANCHOR_NAV_SCOPE,
);

/** header 的按钮与子区域预览共用同一份口径 */
export type AnchorNavScopeState = {
  /** 当前切换口径 */
  scope: AnchorNavScope;
  /** 换一种口径（顺带写存储） */
  setScope: (scope: AnchorNavScope) => void;
};

/**
 * 管理子区域预览的前后切换口径。
 *
 * @returns 当前口径与切换动作（`AnchorNavScopeState`）
 */
export const useAnchorNavScope = (): AnchorNavScopeState => {
  const [scope, setScope] = useStoredState(
    ANCHOR_NAV_SCOPE_STORAGE_KEY,
    SCOPE_CODEC,
  );

  return { scope, setScope };
};
