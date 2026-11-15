/**
 * 预览弹窗内部的纯函数。
 */

/**
 * 在动作前面挂一段副作用（收弹层这类「先收拾再动作」的通用形态），动作本身为空时原样返回。
 *
 * 为什么需要它：翻篇、刷新前要收起 header 的就近弹层——面板里的条件只属于当前这一篇，
 * 内容已经换掉了还挂在屏上，容易让人以为筛的是新的一篇。
 *
 * @param before 动作之前要跑的副作用，如收起弹层
 * @param action 真正的动作；`null` / `undefined` 表示这一侧不可用，直接透传
 */
export const withSideEffect = (
  before: () => void,
  action: (() => void) | null | undefined,
): (() => void) | null | undefined =>
  action
    ? () => {
        before();
        action();
      }
    : action;
