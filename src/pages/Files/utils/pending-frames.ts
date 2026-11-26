/**
 * 飞行块的帧序列：位移与缩放都相对「起点矩形」这一套基准（`from`），
 * 两趟互为镜像，折返那趟从当前帧接着推。
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
  /** 折返：从 `current` 这一帧起手，直接推到对面终点 */
  reversed: boolean;
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

/** 当前这一帧的位移与缩放：折返时从这儿接着走（旧动画带 `fill: forwards`，读到的正是此刻） */
export const readFrame = (
  block: HTMLElement,
): { scale: number; x: number; y: number } | null => {
  const value = window.getComputedStyle(block).transform;

  if (value === '' || value === 'none') {
    return null;
  }

  const matched = /matrix\(([^)]+)\)/.exec(value);

  if (matched === null) {
    return null;
  }

  const parts = matched[1].split(',').map((part) => Number.parseFloat(part));

  if (parts.length < 6 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return { scale: parts[0], x: parts[4], y: parts[5] };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 折返那趟：从读到的当前帧直接推到对面终点，中间只补一个 60% 的点——
 * 「飞到一半被推回去」的手感，不再重走「抬一下、停一下」的整段仪式。
 */
const reversedFrames = (
  args: FlightFramesArgs,
  current: { scale: number; x: number; y: number } | null,
): FlightFrame[] => {
  const { direction, dx, dy, landScale } = args;
  const endY = direction === 'in' ? dy : dy + 3;
  const endScale = direction === 'in' ? landScale : 1;
  const start = current ?? { scale: direction === 'in' ? 0.3 : 1, x: 0, y: 0 };
  const at = (t: number): FlightFrame => ({
    offset: t,
    opacity: 1,
    transform: `translate(${lerp(start.x, dx, t)}px, ${lerp(start.y, endY, t)}px) scale(${lerp(start.scale, endScale, t)})`,
  });

  return [
    {
      opacity: 1,
      transform: `translate(${start.x}px, ${start.y}px) scale(${start.scale})`,
    },
    at(0.6),
    {
      opacity: direction === 'in' ? 0 : 1,
      transform: `translate(${dx}px, ${endY}px) scale(${endScale})`,
    },
  ];
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
export const framesFor = (
  args: FlightFramesArgs,
  current: { scale: number; x: number; y: number } | null,
): FlightFrame[] => {
  if (args.reversed) {
    return reversedFrames(args, current);
  }

  return args.direction === 'in' ? enteringFrames(args) : leavingFrames(args);
};
