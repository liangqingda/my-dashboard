/**
 * 弹窗外壳的常量。
 */

/** 复制快捷键成功提示的固定 id：连按不叠一屏（失败那条与复制按钮共用同一个 id） */
export const COPY_SUCCESS_NOTICE_ID = 'free-modal-copy-success';

/** 浮层 header 的自动隐藏时长（毫秒）：鼠标静止多久收起，与播放器控制栏同一个节奏 */
export const HEADER_HIDE_DELAY = 1000;

/** 打开：从打开点长大的时长（毫秒）；与程序坞窗口同一个节奏 */
export const MODAL_ENTER_DURATION = 380;

/** 关闭：缩回打开点的时长（毫秒）；比展开快一档，收起不拖泥带水 */
export const MODAL_EXIT_DURATION = 220;

/** 没有打开点（程序化打开 / 来源已过期）时的淡入淡出时长（毫秒） */
export const MODAL_FADE_DURATION = 160;

/**
 * 起点最小缩放：980px 的阅读窗从 32px 的按钮缩起，纯按几何算是 0.03，
 * 视觉上会小到看不出形状；留一个下限，仍然明显是「从那儿长出来」。
 */
export const MODAL_MIN_ORIGIN_SCALE = 0.06;

/** 框体的 DOM 标记：开合动画按它找根节点，与程序坞的 `data-dock-surface` 分开 */
export const MODAL_SURFACE_ATTRIBUTE = 'data-motion-surface';

/** 框体选择器：Mantine 把内容框渲染成 `<section role="dialog">` */
export const MODAL_SURFACE_SELECTOR = 'section[role="dialog"]';

/** 遮罩选择器：Mantine Overlay 的静态类名片段 */
export const MODAL_OVERLAY_SELECTOR = '[class*="mantine-Overlay-root"]';
