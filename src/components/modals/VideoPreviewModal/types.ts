/**
 * 视频预览的入参：
 * - 条目与切换归调用方（它知道文件在哪）；
 * - 截图落盘也归调用方，组件只给「一帧 + 目标目录」；
 * - 界面偏好存在 localStorage，命名空间由调用方给（`storageScope`）。
 */

import type { PreviewItem } from '@/components/modals/PreviewItemList/types';

/** 弹窗里可切换的一条视频 */
export type VideoPreviewItem = PreviewItem & {
  /** 视频地址（浏览器可直接播放的 URL） */
  src: string;
  /**
   * 封面：网格用的那张缩略图，挂成 `<video poster>`。
   * 打开时先把这张图摆出来，而不是黑底转圈；同一地址网格已经取过，走缓存几乎不额外发请求。
   */
  poster: string;
};

/** 截图落盘成功后的回执：文案由调用方拼（它才知道存到了哪里） */
export type VideoPreviewCaptureReceipt = {
  /** 成功提示的正文 */
  message: string;
};

/** 视频预览弹窗的入参 */
export type VideoPreviewModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 当前目录里的视频列表：header 计数与翻篇、侧栏都按这份算 */
  items: readonly VideoPreviewItem[];
  /** 当前条目的 id；不在列表里时不渲染内容 */
  activeId: string | null;
  /** 页面标识（对应路由）：拼设置项的存储键，组件自己不写死是哪一页 */
  storageScope: string;
  /** 切换条目（侧栏点选、翻篇都走它） */
  onSelect: (id: string) => void;
  /** 关闭 */
  onClose: () => void;
  /** 截图当前视频帧：入参是 PNG data URL 与目标目录（空串表示默认桌面） */
  onCapture: (
    dataUrl: string,
    captureDir: string,
  ) => Promise<VideoPreviewCaptureReceipt>;
  /**
   * 选截图存放目录（系统目录选择框由调用方实现）；返回 null 表示用户取消。
   * 不传则设置面板里的路径没有「选择目录」。
   */
  onPickDir?: () => Promise<string | null>;
  /**
   * 用外部播放器打开当前视频（页面实现：IINA 优先，回落系统默认）。
   * 不传则 header 没有那颗按钮——组件不认识「IINA」或「文件在哪」，只把条目 id 交回去。
   */
  onOpenExternal?: (id: string) => void;
  /**
   * 删除当前视频的请求：只应打开二次确认层，不在这里直接删；
   * 不传则 header 没有删除按钮，`Delete` 键也不触发。
   */
  onRequestDelete?: (() => void) | null;
  /**
   * 上层浮层（删除二次确认）开着：整组快捷键与焦点陷阱交给那一层，
   * 底下的播放器不再响应空格 / 方向键 / Delete。
   */
  blocked?: boolean;
  /**
   * 打开时直接进整屏全屏（文件页设置项）。需要浏览器还在用户的这次点击激活窗口内，
   * 拿不到手势时静默停在这个尺寸，不弹失败提示。
   */
  defaultFullscreen?: boolean;
};
