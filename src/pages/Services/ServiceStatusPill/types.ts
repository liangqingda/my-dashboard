/**
 * 状态徽标组件的 props。
 */

import type { BuildState } from '@/services/types';

export type ServiceStatusPillProps = {
  /** 编译 / 启动状态 */
  build: BuildState;
  /** 是否在运行 */
  running: boolean;
  /** 额外类名 */
  className?: string;
  /** 紧凑模式：与小标签（如"开机自启"）同行时使用 */
  compact?: boolean;
};
