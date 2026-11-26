/**
 * 省略文本的契约：文案 + 交互与 tip 位置，省略与是否需要 tip 由组件自己判断。
 */

import type { FloatingPosition } from '@mantine/core';

/** 省略位置：`middle` 头部与尾部都保留、中间省略（默认）；`end` 尾部省略 */
export type TruncationEllipsis = 'end' | 'middle';

export type FreeTruncatedTextProps = {
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
  /** tip 出现方向，默认 right（正右侧）；贴边或被遮挡的场景按需改成 top 等 */
  position?: FloatingPosition;
  /** 最多保留的行数，默认 1；正整数，多行时按高度判断是否被截断 */
  lines?: number;
  /**
   * 省略位置，默认 `middle`（保留头部与尾部，省略号落在最后一行的水平中间）；
   * 宽度会在静止状态下变的位置（可拖列宽、hover 让列变宽）传 `end` 走尾部省略
   */
  ellipsis?: TruncationEllipsis;
  /** tip 固定深底浅字、不随主题反转：压在媒体画面上的提示用 */
  tipDark?: boolean;
};
