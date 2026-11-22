/**
 * 折叠块（`<details>`）里那段内容的点击行为：`expand` 在正文里展开，`modal` 单独开窗读。
 *
 * 与「同文档链接」一样是「怎么看这篇文档」的偏好，不属于某一篇，所以记在 localStorage 里：
 * 换篇、关掉重开、刷新页面后都保持上次的样子。存储值不在枚举里（改版、被手工改坏）
 * 时由 `createChoiceFieldCodec` 回落到默认行为，不会渲染出一个不认识的状态。
 */

import { useStoredField } from '@/hooks/useStoredField';
import { createChoiceFieldCodec } from '@/utils/local-storage';

import type { DetailsBlockBehavior } from '../types';
import {
  DEFAULT_DETAILS_BLOCK_BEHAVIOR,
  DETAILS_BLOCK_BEHAVIORS,
  DETAILS_BLOCK_FIELD,
} from '../constants';

/** 存两档行为之一：缺失或不在枚举里都回落默认（原地展开） */
const BEHAVIOR_CODEC = createChoiceFieldCodec(
  DETAILS_BLOCK_BEHAVIORS,
  DEFAULT_DETAILS_BLOCK_BEHAVIOR,
);

/** header 的按钮与弹窗正文共用同一份行为值 */
export type DetailsBlockBehaviorState = {
  /** 当前点击行为 */
  behavior: DetailsBlockBehavior;
  /** 换一档行为（顺带写存储） */
  setBehavior: (behavior: DetailsBlockBehavior) => void;
};

/**
 * 管理折叠块里那段内容的点击行为。
 *
 * @param storageKey 主预览的偏好命名空间（这一项只挂在主预览上）
 * @returns 当前行为与切换动作（`DetailsBlockBehaviorState`）
 */
export const useDetailsBlockBehavior = (
  storageKey: string,
): DetailsBlockBehaviorState => {
  const [behavior, setBehavior] = useStoredField(
    storageKey,
    DETAILS_BLOCK_FIELD,
    BEHAVIOR_CODEC,
  );

  return { behavior, setBehavior };
};
