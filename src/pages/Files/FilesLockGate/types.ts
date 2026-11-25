/**
 * 文件页安全锁的入参。
 */

/** 密码校验：对上了返回 true，弹窗自己关掉 */
export type FilesLockGateProps = {
  /** 校验输入：对上了返回 true，页面据此解锁 */
  onUnlock: (password: string) => boolean;
};
