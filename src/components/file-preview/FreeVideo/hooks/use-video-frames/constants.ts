/**
 * 抽帧参数：均匀取帧的间隔与上限、绘制分辨率、各一步的超时。
 *
 * 分辨率跟着进度条的预览框走（`SEEK_PREVIEW_WIDTH`），按 2 倍设备像素比绘制：
 * 帧图存的是 data URL，画大了只是内存多几百 KB，缩窗后画质才不掉。
 */

import { SEEK_PREVIEW_WIDTH } from '../../constants';

/** 每多少秒取一帧：再密收益很小，只会拖长首轮准备时间 */
export const SECONDS_PER_FRAME = 4;

/** 最少帧数：短视频也留几档，不能只剩一两张 */
export const MIN_FRAME_COUNT = 8;

/** 最多帧数：首轮抽帧要在后台几秒内跑完，不随时长线性涨 */
export const MAX_FRAME_COUNT = 40;

/** 帧图最长边像素：预览框宽的两倍（贴 2x 屏的清晰度） */
export const FRAME_LONGEST_EDGE = SEEK_PREVIEW_WIDTH * 2;

/** JPEG 质量：缩略图再高只是浪费内存，0.86 已看不出块 */
export const FRAME_JPEG_QUALITY = 0.86;

/** 等 `seeked` 的上限：超时这一帧留空，不卡住整轮 */
export const FRAME_SEEK_TIMEOUT = 3000;

/** 等画面真正呈现的上限：给 `requestVideoFrameCallback` 兜底，它不回调也不吊死 */
export const FRAME_PRESENT_TIMEOUT = 1000;

/** 探针视频拿到元数据的上限：拿不到就整轮放弃，进度条回落到数字浮标 */
export const PROBE_METADATA_TIMEOUT = 10000;

/** `readyState` 到「已有元数据」的档位：到这一档才读得到时长与画面尺寸 */
export const READY_STATE_METADATA = 1;

/** 视频尺寸读不出来时的兜底比例（16:9）：只影响帧图长宽，不影响功能 */
export const FALLBACK_ASPECT = 16 / 9;

/** 抽帧时间离片尾留的余量（秒）：seek 到正片尾会停在最后一帧，多留一点更稳 */
export const FRAME_TAIL_GUARD = 0.1;
