/**
 * 就地改名瓦片的 props。
 */

/** 改名瓦片的入参 */
export type RenameTileProps = {
  /** 当前文件夹名，输入框初始值 */
  name: string;
  /** 提交改名：给出新名字 */
  onCommit: (name: string) => void;
  /** 取消改名：保留条目，退出改名态 */
  onCancel: () => void;
};
