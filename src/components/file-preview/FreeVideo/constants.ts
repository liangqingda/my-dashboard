/**
 * 播放器的常量：控制栏的自动收起时长、控制栏区域的选择器、进度条悬停预览的尺寸比例。
 *
 * 控制栏外层挂着 `data-video-controls`（见 `index.tsx`）；弹窗 header 的自动隐藏拿这个选择器
 * 判断「指针在控制栏上」，避免鼠标划过播放条时把 header 一起唤出来。
 */

/** 播放中指针静止多久收起控制栏（毫秒） */
export const CONTROLS_HIDE_DELAY = 1000;

/** 控制栏区域的选择器：给「不想被这一块触发」的浮层判断用 */
export const CONTROLS_SELECTOR = '[data-video-controls]';

/** 预览框宽度占视频画面宽度的比例：窗口越大帧图越大，60% 看得清又不至于糊住画面 */
export const SEEK_PREVIEW_WIDTH_RATIO = 0.6;

/** 预览框的最小宽度（CSS px）：窗口很小时不至于缩成邮票 */
export const SEEK_PREVIEW_MIN_WIDTH = 240;

/** 预览框与舞台上下边留的空隙（CSS px）：太高会顶到弹窗上沿被裁，按舞台高度收 */
export const SEEK_PREVIEW_STAGE_GAP = 24;

/** 预览框贴边时让开的空隙（CSS px）：两端留一点，浮层不贴着进度条容器边沿 */
export const SEEK_PREVIEW_EDGE_GAP = 4;

/** 帧图按设备像素比放大，但封顶 2 倍：再高只是多占内存，肉眼分不出与 2 倍的差别 */
export const SEEK_PREVIEW_DPR_CAP = 2;

/** 视频画面比例的兜底（16:9）：元数据还没解出来时先按它排版 */
export const VIDEO_FALLBACK_ASPECT = 16 / 9;
