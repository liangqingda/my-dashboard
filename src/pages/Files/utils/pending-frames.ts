/**
 * 飞行块的帧序列：位移与缩放都相对「起点矩形」这一套基准（`from`），两趟互为镜像。
 */

/** 一帧：与 WAAPI 的 keyframe 同形 */
export type FlightFrame = {
  opacity: number;
  offset?: number;
  transform: string;
};

/** 画帧要的几何量：都由 `index.tsx` 量好再进来 */
export type FlightFramesArgs = {
  /** 方向：`in` 收进待拖拽区、`out` 飞回列表 */
  direction: 'in' | 'out';
  /** 落点相对起点的位移 */
  dx: number;
  dy: number;
  /** 飞到半路时的缩放 */
  midScale: number;
  /** 落到落点时的缩放 */
  endScale: number;
  /** 落进待拖拽区那一格时再收一点的缩放（`endScale * 0.85`） */
  landScale: number;
};

/** 正常那趟：移入是「盖住原位 → 抬起 → 收到九成停一下 → 缩成图标落进那一格」 */
const enteringFrames = ({ dx, dy, midScale, endScale, landScale }: FlightFramesArgs): FlightFrame[] => [
  { opacity: 1, transform: 'translate(0, 0) scale(1)' },
  { offset: 0.08, opacity: 1, transform: 'translate(0, -6px) scale(1)' },
  { offset: 0.2, opacity: 1, transform: 'translate(0, -8px) scale(0.9)' },
  { offset: 0.32, opacity: 1, transform: 'translate(0, -8px) scale(0.9)' },
  {
    offset: 0.62,
    opacity: 1,
    transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(${midScale})`,
  },
  { offset: 0.84, opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${endScale})` },
  { offset: 0.92, opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${endScale})` },
  { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${landScale})` },
];

/** 正常那趟：移出是「小图标起步 → 三成时换真身 → 到落点上方九成停一下 → 补满并下沉 3px」 */
const leavingFrames = ({ dx, dy, midScale }: FlightFramesArgs): FlightFrame[] => [
  { opacity: 1, transform: 'translate(0, 0) scale(0.3)' },
  { offset: 0.16, opacity: 1, transform: 'translate(0, -6px) scale(0.3)' },
  {
    offset: 0.62,
    opacity: 1,
    transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(${midScale})`,
  },
  { offset: 0.84, opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(0.9)` },
  { offset: 0.93, opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(0.9)` },
  { opacity: 1, transform: `translate(${dx}px, ${dy + 3}px) scale(1)` },
];

/** 这一趟该放哪串帧 */
export const framesFor = (args: FlightFramesArgs): FlightFrame[] =>
  args.direction === 'in' ? enteringFrames(args) : leavingFrames(args);
