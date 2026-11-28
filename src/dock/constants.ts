/**
 * 程序坞的常量：存储键、层级、固定尺寸与动画时长。
 * 层级按「页面 < 弹窗 < 程序坞窗口 < 程序坞 < 弹窗内就近弹层 < 通知 < 二次确认」排，
 * 业务侧不再各自写全局 z-index。
 */

/** 收起窗口列表的存储键 */
export const DOCK_ENTRIES_STORAGE_KEY = 'app:dock';

/** 程序坞条自身的层级：必须压过所有弹窗遮罩，遮罩才盖不住它 */
export const DOCK_Z_INDEX = 1010;

/** 恢复出来的窗口的层级：压过页面与既有弹窗（含服务页全屏拖拽 700） */
export const DOCK_WINDOW_Z_INDEX = 1000;

/** 弹窗内就近弹层的层级：压过程序坞窗口与程序坞条，又不盖住 tooltip */
export const DOCK_POPOVER_Z_INDEX = 1020;

/**
 * 全局通知的层级：必须压过程序坞窗口（1000）、程序坞条（1010）与窗内就近弹层（1020），
 * 否则程序坞窗口里的截图成功这类提示会被窗口盖住；二次确认（1040）仍要压过通知。
 */
export const NOTIFICATION_Z_INDEX = 1030;

/** 飞入 / 飞出过程中那一层克隆的层级：比程序坞还高，落点才看得见 */
export const DOCK_FLY_Z_INDEX = 1150;

/**
 * 程序坞最多留几条：上限是「程序坞承载 + 单次写入体积」的固定边界
 * （每次收起都会把整份条目 JSON 序列化后同步写一遍），不是为了兜配额。
 * 满了就**拒收新条目并提示**，不淘汰已经在坞里的条目；同 id 已收录的只换快照，不受上限影响。
 */
export const MAX_DOCK_ENTRIES = 16;

/** 图标边长（px）：固定不跟设置走 */
export const DOCK_ITEM_SIZE = 36;

/** 指针悬停时的最大放大倍数：110% */
export const DOCK_MAGNIFICATION = 1.1;

/** 程序坞与屏幕底边的间距 */
export const DOCK_EDGE_GAP = 10;

/** 从图标中心展开的时长（毫秒） */
export const DOCK_TRANSFORM_DURATION = 420;

/** 收回到图标中心的时长（毫秒）：比展开快一档，收起不拖泥带水 */
export const DOCK_SHRINK_DURATION = 220;

/** 程序坞里换窗：新窗滑入的时长（毫秒） */
export const DOCK_SLIDE_DURATION = 360;

/** 换窗时旧窗滑出的时长（毫秒）：必须短于新窗，下一扇完全就位前旧窗先离场 */
export const DOCK_SLIDE_OUT_DURATION = 240;

/** 从程序坞移除当前窗口走默认淡出：时长与 FreeModal 的一致 */
export const DOCK_DISMISS_DURATION = 140;

/** 页面弹窗 / 瓦片收进程序坞时，飞行克隆的时长（毫秒） */
export const DOCK_FLY_DURATION = 520;
