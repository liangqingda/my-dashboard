/**
 * 应用瓦片的 props。
 */

import type { AppEntry } from '../types';

/** 网格里一条应用包的入参 */
export type AppTileProps = {
  /** 应用摘要 */
  app: AppEntry;
  /** 正在启动这个应用：按钮暂时不可点，副文案换成「正在打开…」 */
  launching: boolean;
  /** 点瓦片打开应用 */
  onOpen: () => void;
  /** hover 玻璃层不透明度（0–100），与文件瓦片同一档设置 */
  veilOpacity?: number;
  /** 请求卸载这个应用（先弹二次确认，系统自带应用不会走到这里） */
  onRequestUninstall: () => void;
};
