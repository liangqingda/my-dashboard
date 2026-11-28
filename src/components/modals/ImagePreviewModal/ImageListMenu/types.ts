/**
 * 图片列表弹层的契约：按钮在 header 里，弹层开在按钮正下方，列当前目录的全部图片。
 */

import type { ImagePreviewItem } from '../types';

/** 图片列表弹层的入参 */
export type ImageListMenuProps = {
  /** 当前目录里的图片（顺序即翻篇顺序） */
  items: readonly ImagePreviewItem[];
  /** 正在预览的条目 id */
  activeId: string;
  /** 弹层是否打开（开合归弹窗：开着时 header 恒可见） */
  opened: boolean;
  /** 开合变化（点按钮、点弹层外面、按 Esc 都会走到这里） */
  onChangeOpened: (opened: boolean) => void;
  /** 点选某一张 */
  onSelect: (id: string) => void;
  /** 条目省略 tip 固定深底浅字、不随主题反转 */
  tipDark?: boolean;
  /** 弹层层级：程序坞窗口里抬到窗口之上 */
  zIndex?: number;
};
