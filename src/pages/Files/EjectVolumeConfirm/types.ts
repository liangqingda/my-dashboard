/**
 * 推出外接盘确认弹窗的入参：要退哪一块盘、是否正在退、取消与确认。
 */

import type { EjectingVolume } from '../hooks/useVolumeEject';

/** 弹窗的入参 */
export type EjectVolumeConfirmProps = {
  /** 等待确认的外接卷；null 表示弹窗关闭 */
  volume: EjectingVolume | null;
  /** 推出请求进行中：按钮转圈并禁用 */
  loading: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 确认推出 */
  onConfirm: () => void;
};
