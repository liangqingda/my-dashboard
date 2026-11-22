/**
 * 就地改名瓦片的 props。
 */

import type { ReactNode } from 'react';

/** 改名瓦片的入参 */
export type RenameTileProps = {
  /** 当前条目名，输入框初始值 */
  name: string;
  /** 条目图标：文件夹给文件夹图标，文件按分类给文件图标 */
  icon: ReactNode;
  /** 提交改名：给出新名字 */
  onCommit: (name: string) => void;
  /** 取消改名：保留条目，退出改名态 */
  onCancel: () => void;
};
