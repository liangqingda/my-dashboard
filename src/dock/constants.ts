/**
 * 程序坞的常量：存储键、层级、固定尺寸与动画时长。
 * 层级按「页面 < 弹窗 < 通知 < 程序坞窗口 < 程序坞」排，业务侧不再各自写 z-index。
 */

/** 收起窗口列表的存储键 */
export const DOCK_ENTRIES_STORAGE_KEY = 'app:dock';

/** 程序坞条自身的层级：必须压过所有弹窗遮罩，遮罩才盖不住它 */
export const DOCK_Z_INDEX = 1010;

/** 恢复出来的窗口的层级：压过页面与既有弹窗（含服务页全屏拖拽 700） */
export const DOCK_WINDOW_Z_INDEX = 1000;

/** 飞入 / 飞出过程中那一层克隆的层级：比程序坞还高，落点才看得见 */
export const DOCK_FLY_Z_INDEX = 1150;

/** 程序坞最多留几条：超出按收起时间淘汰最旧的，避免 localStorage 被快照撑爆 */
export const MAX_DOCK_ENTRIES = 8;

/** 图标边长（px）：固定不跟设置走 */
export const DOCK_ITEM_SIZE = 36;

/** 指针悬停时的最大放大倍数：110% */
export const DOCK_MAGNIFICATION = 1.1;

/** 程序坞与屏幕底边的间距 */
export const DOCK_EDGE_GAP = 10;

/** 从图标中心展开 / 收回到图标中心的时长（毫秒） */
export const DOCK_TRANSFORM_DURATION = 420;

/** 程序坞里换窗：左右整屏滑动的时长（毫秒） */
export const DOCK_SLIDE_DURATION = 360;

/** 关闭（X / Esc）走弹窗默认淡出：时长与 FreeModal 的一致 */
export const DOCK_DISMISS_DURATION = 140;

/** 页面弹窗 / 瓦片收进程序坞时，飞行克隆的时长（毫秒） */
export const DOCK_FLY_DURATION = 520;
