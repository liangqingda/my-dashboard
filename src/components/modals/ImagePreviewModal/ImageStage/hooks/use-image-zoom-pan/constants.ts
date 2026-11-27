/** 缩放倍率的下限：1 = 「整图装下」的原始大小，比它更小只会让画面缩在中间一圈黑边里 */
export const MIN_IMAGE_SCALE = 1;

/** 缩放倍率的上限：再往上只剩马赛克，也给位移夹取一个有限范围 */
export const MAX_IMAGE_SCALE = 5;

/** 捏合 / Ctrl+滚轮的速度：`deltaY` 每 1px 对应的缩放指数 */
export const WHEEL_ZOOM_SPEED = 0.005;

/** 单次滚轮的缩放变化最多缩到 0.5 倍：鼠标滚轮一格动辄上百像素，不夹会一格就跳到底 */
export const WHEEL_ZOOM_STEP_MIN = 0.5;

/** 单次滚轮的缩放变化最多放大到 2 倍 */
export const WHEEL_ZOOM_STEP_MAX = 2;

/** 行模式的滚动量换算成像素：Firefox 的鼠标滚轮报的是行数，不换算会几乎挪不动画面 */
export const WHEEL_LINE_HEIGHT = 16;
