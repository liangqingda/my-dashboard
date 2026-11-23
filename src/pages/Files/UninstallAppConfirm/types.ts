/**
 * 卸载确认弹窗的入参：要卸哪一个、残留报告与请求态、取消与确认。
 */

import type { AppEntry, AppResidueReport } from '../types';

/** 弹窗的入参 */
export type UninstallAppConfirmProps = {
  /** 等待确认卸载的应用；null 表示弹窗关闭 */
  app: AppEntry | null;
  /** 卸载前的残留报告；还没取到时为 null */
  report: AppResidueReport | null;
  /** 取残留失败的原因；有值时确认不可点 */
  reportError: string | null;
  /** 正在取残留清单 */
  loadingReport: boolean;
  /** 卸载请求进行中：按钮转圈并禁用 */
  uninstalling: boolean;
  /** 取消 / 关闭弹窗 */
  onCancel: () => void;
  /** 确认卸载 */
  onConfirm: () => void;
};
