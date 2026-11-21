/**
 * 折叠块子预览的前后切换口径（只算「原文类」折叠块，见 `listDetailBlockPeers`）：
 * `all` 切换全文所有原文类折叠块，`section` 只切换同一个标题小节下的那几个
 * （计数就是这一小节的块数）。
 *
 * 与「点击行为」一样是「怎么看折叠块」的偏好，不属于某一篇：记在 localStorage，
 * 换篇、关掉重开、刷新页面后都保持上次的样子；存储值不在枚举里（改版、被手工改坏，
 * 例如上一版的 `kind`）时由 `createChoiceCodec` 回落默认（同一小节）。
 */

import { useStoredState } from '@/hooks/useStoredState';
import { createChoiceCodec } from '@/utils/local-storage';

import type { DetailsNavScope } from '../types';
import {
  DEFAULT_DETAILS_NAV_SCOPE,
  DETAILS_NAV_SCOPES,
  DETAILS_NAV_SCOPE_STORAGE_KEY,
} from '../constants';

/** 存两种口径之一：缺失或不在枚举里都回落默认 */
const SCOPE_CODEC = createChoiceCodec(
  DETAILS_NAV_SCOPES,
  DEFAULT_DETAILS_NAV_SCOPE,
);

/** header 的按钮与折叠块子预览共用同一份口径 */
export type DetailsNavScopeState = {
  /** 当前切换口径 */
  scope: DetailsNavScope;
  /** 换一种口径（顺带写存储） */
  setScope: (scope: DetailsNavScope) => void;
};

/**
 * 管理折叠块子预览的前后切换口径。
 *
 * @returns 当前口径与切换动作（`DetailsNavScopeState`）
 */
export const useDetailsNavScope = (): DetailsNavScopeState => {
  const [scope, setScope] = useStoredState(
    DETAILS_NAV_SCOPE_STORAGE_KEY,
    SCOPE_CODEC,
  );

  return { scope, setScope };
};
