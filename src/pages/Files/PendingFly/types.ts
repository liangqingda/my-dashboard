import type { PendingFly } from '../hooks/use-drag-pending/types';

/** 动画层的入参：飞的是哪一条、从哪来，播完通知页面收掉 */
export type PendingFlyLayerProps = {
  /** 待飞的一条 */
  fly: PendingFly;
  /** 播完（或没播成）时收掉它 */
  onDone: () => void;
};
