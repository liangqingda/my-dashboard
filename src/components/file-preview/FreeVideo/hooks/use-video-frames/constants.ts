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
export const FRAME_SEEK_TIMEOUT = 5000;

/** 等「当前帧数据真的可用」（`readyState >= 2`）的上限：`seeked` 之后仍可能只有元数据 */
export const FRAME_DATA_TIMEOUT = 2000;

/** 等数据可用的轮询间隔（毫秒）：事件不一定齐，轮询兜住 */
export const FRAME_DATA_POLL = 100;

/** 等画面真正呈现的上限：从挂在 seek 之前算起，要盖住整个 seek 耗时；超时就丢掉这一帧 */
export const FRAME_PRESENT_TIMEOUT = 8000;

/** 呈现帧与目标时间的容差（秒）：`mediaTime` 落在这么近才算「就是这一帧」 */
export const FRAME_PRESENT_TOLERANCE = 0.5;

/** `readyState` 到「当前帧数据可用」的档位：低于它 `drawImage` 会画出空白 */
export const FRAME_DRAW_READY_STATE = 2;

/** 探针视频拿到元数据的上限：拿不到就整轮放弃，进度条回落到数字浮标 */
export const PROBE_METADATA_TIMEOUT = 10000;

/** `readyState` 到「已有元数据」的档位：到这一档才读得到时长与画面尺寸 */
export const READY_STATE_METADATA = 1;

/** 抽帧时间离片尾留的余量（秒）：seek 到正片尾可能停在最后一帧，多留一点更稳 */
export const FRAME_TAIL_GUARD = 0.05;
