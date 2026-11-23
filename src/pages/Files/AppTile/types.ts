/**
 * 应用瓦片的 props。
 */

import type { AppEntry } from '../types';

/** 网格里一条应用包的入参 */
export type AppTileProps = {
  /** 应用摘要 */
  app: AppEntry;
  /** 请求卸载这个应用（先弹二次确认，系统自带应用不会走到这里） */
  onRequestUninstall: () => void;
};
