/**
 * 同文档锚点链接的点击行为：`jump` 在当前正文里跳过去，`modal` 把那一节单独开窗预览。
 *
 * 这是「怎么看链接」的偏好，不属于某一篇，所以记在 localStorage 里：
 * 换篇、关掉重开、刷新页面后都保持上次的样子。存储值不在枚举里（改版、被手工改坏）
 * 时由 `createChoiceCodec` 回落到默认行为，不会渲染出一个不认识的状态。
 */

import { useStoredState } from '@/hooks/useStoredState';
import { createChoiceCodec } from '@/utils/local-storage';

import type { AnchorLinkBehavior } from '../types';
import {
  ANCHOR_LINK_BEHAVIORS,
  ANCHOR_LINK_STORAGE_KEY,
  DEFAULT_ANCHOR_LINK_BEHAVIOR,
} from '../constants';

/** 存两档行为之一：缺失或不在枚举里都回落默认（跳过去） */
const BEHAVIOR_CODEC = createChoiceCodec(
  ANCHOR_LINK_BEHAVIORS,
  DEFAULT_ANCHOR_LINK_BEHAVIOR,
);

/** header 的按钮与弹窗正文共用同一份行为值 */
export type AnchorLinkBehaviorState = {
  /** 当前点击行为 */
  behavior: AnchorLinkBehavior;
  /** 换一档行为（顺带写存储） */
  setBehavior: (behavior: AnchorLinkBehavior) => void;
};

/**
 * 管理同文档链接的点击行为。
 *
 * @returns 当前行为与切换动作（`AnchorLinkBehaviorState`）
 */
export const useAnchorLinkBehavior = (): AnchorLinkBehaviorState => {
  const [behavior, setBehavior] = useStoredState(
    ANCHOR_LINK_STORAGE_KEY,
    BEHAVIOR_CODEC,
  );

  return { behavior, setBehavior };
};
