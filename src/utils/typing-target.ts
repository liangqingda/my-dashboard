/**
 * 判断键盘事件的落点是不是「正在打字」的控件。
 *
 * 全局快捷键（翻篇、撤销这类）都挂在 window / 容器上，一旦用户正在输入框里敲字，
 * 字符键属于输入本身，快捷键必须放行，否则会把打进去的字符抢走。
 */

/**
 * 事件目标是否正在接受文本输入：输入框、文本域或可编辑区。
 *
 * 读的是 `event.target`，只在 `keydown` 这类键盘事件里用。
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  return target.isContentEditable;
};
