/**
 * 外观组的入参：值都由设置面板透传，组件只读值、只回调。
 */

import type { FilesViewMode } from '../../../types';

/** 外观组的 props */
export type AppearanceGroupProps = {
  /** 列表是否按类型分组成段展示 */
  grouped: boolean;
  /** 改分组展示开关 */
  onGroupedChange: (enabled: boolean) => void;
  /** 改网格列宽下限 */
  onTileMinWidthChange: (width: number) => void;
  /** 改 hover 玻璃层透明度 */
  onVeilOpacityChange: (opacity: number) => void;
  /** 改展示形态 */
  onViewModeChange: (view: FilesViewMode) => void;
  /** 网格列宽下限（px） */
  tileMinWidth: number;
  /** hover 玻璃层透明度（0–100） */
  veilOpacity: number;
  /** 当前展示形态：网格 / 表格 */
  view: FilesViewMode;
};
