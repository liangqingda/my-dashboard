/**
 * 播放器的常量：控制栏的自动收起时长、进度条悬停预览的尺寸比例。
 */

/** 指针静止多久收起控制栏（毫秒）：与浮层 header 同一节奏，暂停 / 播完也照此收起 */
export const CONTROLS_HIDE_DELAY = 1000;

/** 预览框宽度占视频画面宽度的比例（默认值）：窗口越大帧图越大，60% 看得清又不至于糊住画面 */
export const SEEK_PREVIEW_SCALE_DEFAULT = 0.6;

/** 预览框比例的合法区间：再小帧内容看不清，再大就糊住半个画面 */
export const SEEK_PREVIEW_SCALE_MIN = 0.3;

/** 预览框比例的上限：留一圈画面，不整块盖住视频 */
export const SEEK_PREVIEW_SCALE_MAX = 0.9;

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

/**
 * 抽帧探针挂地址的延迟（毫秒）：主画面就绪后再等这么久，才把地址交给那支隐藏探针。
 * 打开 / 连翻视频时只有主视频一条流在读盘，被翻过去的片子一条数据都不会抽；
 * 探针本身只取元数据（`preload="metadata"`），真正要帧时再按位置拉那一段。
 */
export const PROBE_ARM_DELAY = 600;

/**
 * 控制栏的选择器：控制栏是播放器自己的 chrome，自带一套显隐节奏，
 * 指针在上面活动不该把外层的浮层 header 顶出来。弹窗按它过滤指针活动
 * （见 `FreeModal` 的 `headerOverlay.ignoreSelector`），所以控制栏根节点带 `data-video-controls`。
 */
export const VIDEO_CONTROLS_SELECTOR = '[data-video-controls]';
