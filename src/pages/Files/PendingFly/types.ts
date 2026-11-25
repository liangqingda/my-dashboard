import type { PendingFlight } from '../hooks/use-drag-pending/types';

/** 动画层的入参：这一次往哪飞、从哪起飞，播完通知页面收掉 */
export type PendingFlightLayerProps = {
  /** 待飞的一次 */
  flight: PendingFlight;
  /** 播完（或没播成）时收掉它 */
  onDone: () => void;
};
