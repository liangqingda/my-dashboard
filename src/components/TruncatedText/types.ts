/**
 * 单行省略文本的契约：文案 + 交互与 tip 位置，省略与是否需要 tip 由组件自己判断。
 */

import type { FloatingPosition } from '@mantine/core';

export type TruncatedTextProps = {
  /** 文本内容 */
  text: string;
  /** 文本样式（字号、颜色、缩进等）；省略号与 tip 由组件负责，不要自己再写 overflow / ellipsis */
  className?: string;
  /** 禁用：按钮不响应点击，也不弹 tip（如编辑态） */
  disabled?: boolean;
  /** 夹在一行文字里时用 inline-block；默认整块占满容器宽度 */
  inline?: boolean;
  /** 传入后渲染成 button（可点击的条目）；不传则是普通 span */
  onClick?: () => void;
  /** tip 打开延迟（毫秒），默认 0：不用等浏览器原生提示那一秒 */
  openDelay?: number;
  /** tip 出现方向，默认 right（正右侧）；贴边或被遮挡的场景按需改成 top 等 */
  position?: FloatingPosition;
};
