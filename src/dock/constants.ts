/**
 * 程序坞的常量：存储键、层级、尺寸与动画时长。
 * 层级按「页面 < 弹窗 < 通知 < 程序坞窗口 < 程序坞」排，业务侧不再各自写 z-index。
 */

/** 一本设置对象的存储键：应用级偏好，不带页面标识 */
export const DOCK_SETTINGS_STORAGE_KEY = 'app:dock-settings';

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

/** 收起（窗口 → 程序坞）动画时长（毫秒） */
export const DOCK_MINIMIZE_DURATION = 420;

/** 展开（程序坞 → 窗口）动画时长（毫秒） */
export const DOCK_RESTORE_DURATION = 440;

/** 程序坞里换窗的原位淡入时长（毫秒） */
export const DOCK_SWAP_DURATION = 200;

/** 程序坞与屏幕边缘的间距 */
export const DOCK_EDGE_GAP = 12;

/** 刚收进程序坞时给落点打一下的属性：图标收一下再回弹 */
export const DOCK_RECEIVE_ATTRIBUTE = 'data-receiving';
