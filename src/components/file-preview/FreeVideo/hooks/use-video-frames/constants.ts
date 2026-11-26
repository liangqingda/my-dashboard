/**
 * 抽帧参数：缓存粒度与容量、绘制质量与各一步的超时。
 *
 * 帧图分辨率不再写死：由调用方按「预览框宽度 × 设备像素比」传 `frameLongestEdge`，
 * 预览框跟着视频窗口大小（60%）走，窗口越大帧图越清。
 */

/** 时间桶（秒）：同一个桶内 hover 复用同一张图；粗一点少抽帧，半秒内的画面差别看不出来 */
export const FRAME_TIME_BUCKET = 0.5;

/** 缓存上限（张）：按插入顺序淘汰最早的，80 张约 3–5 MB */
export const FRAME_CACHE_LIMIT = 80;

/** JPEG 质量：预览图再高只是多占内存，0.88 已看不出块 */
export const FRAME_JPEG_QUALITY = 0.88;

/** 等 `seeked` 的上限：高码率大文件跳远位置要解码到关键帧，给足再判失败 */
export const FRAME_SEEK_TIMEOUT = 10000;

/** 等「当前帧数据真的可用」（`readyState >= 2`）的上限：`seeked` 之后仍可能只有元数据 */
export const FRAME_DATA_TIMEOUT = 3000;

/** 等数据可用的轮询间隔（毫秒）：事件不一定齐，轮询兜住 */
export const FRAME_DATA_POLL = 100;

/**
 * 等 `requestVideoFrameCallback` 回调的上限（毫秒）：正常环境 seeked 之后几十毫秒就来，
 * 给到 2.5 秒足够；超时不再死等，退回「数据就绪 + 时间对得上」的判据接着取，避免整块转圈。
 */
export const FRAME_PRESENT_TIMEOUT = 2500;

/**
 * 重试落帧的位移（秒）：暂停的探针 seek 后常常只解到最近的关键帧上，`mediaTime` 与目标差得多。
 * 把指针位置挪这么一点点再 seek 一次，解码器会重新落帧，多数情况下这一次就对上了。
 */
export const FRAME_RETRY_OFFSET = 0.06;

/** 重试那一次的等待上限（毫秒）：只在「第一次没对上」时用，比正常等待短，不把用户拖住 */
export const FRAME_RETRY_TIMEOUT = 1500;

/** 呈现帧与目标时间的容差（秒）：`mediaTime` 落在这么近才算「就是这一帧」 */
export const FRAME_PRESENT_TOLERANCE = 0.5;

/** `readyState` 到「当前帧数据可用」的档位：低于它 `drawImage` 会画出空白 */
export const FRAME_DRAW_READY_STATE = 2;

/** `readyState` 到「已有元数据」的档位：到这一档才读得到时长与画面尺寸 */
export const READY_STATE_METADATA = 1;

/** 抽帧时间离片尾留的余量（秒）：seek 到正片尾可能停在最后一帧，多留一点更稳 */
export const FRAME_TAIL_GUARD = 0.05;

/**
 * 截图等「画面真的换过去」的上限（毫秒）：比预览短。
 * 用户按下回车后界面一直在转圈，等太久不如早点用现有判据兜底；
 * 兜底判据与预览一致，画面不会因此跳到别处。
 */
export const FRAME_CAPTURE_PRESENT_TIMEOUT = 1200;
