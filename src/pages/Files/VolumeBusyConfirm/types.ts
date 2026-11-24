/**
 * 外接盘还被占用时的第二次确认：第一次卸载失败后，把占着这块盘的进程逐条列出来，
 * 用户同意才让中间件结束它们再重试；系统进程与别的用户的进程只列出来、不给结束。
 */

import type { VolumeBusyState, EjectingVolume } from '../hooks/useVolumeEject';

/** 弹窗入参 */
export type VolumeBusyConfirmProps = {
  /** 还占着盘的情况；null 表示没到这一步 */
  busy: VolumeBusyState | null;
  /** 正在结束进程 / 重试推出 */
  loading: boolean;
  /** 要退的那一卷 */
  volume: EjectingVolume | null;
  /** 取消：什么都不做，关掉整条推出流程 */
  onCancel: () => void;
  /** 确认：结束能结束的进程后重试 */
  onConfirm: () => void;
};
