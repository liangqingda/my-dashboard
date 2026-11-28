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
  /**
   * 切换序号：由持有 `activeId` 的那一层报（翻篇 / 选集点选 / 删除后顺位切换都会加一），
   * 弹窗只把它转给左上角的计数浮标；打开与关窗时归零。
   */
  switchTick: number;
  /** 切换条目（侧栏点选、翻篇都走它） */
  onSelect: (id: string) => void;
  /** 关闭 */
  onClose: () => void;
  /** 截图当前视频帧：入参是 PNG data URL 与目标目录（空串表示默认桌面） */
  onCapture?: (
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
  /** 设置里选定的外部播放器名称（IINA / TV 等），只用于按钮提示 */
  externalApp?: string;
  /**
   * 把当前视频加入 / 移出调用方的待拖拽区；不传则控制栏没有那颗按钮。
   * 传入的是当前条目 id：程序坞里翻篇后，动作要落在当前这一条而不是页面原来那条。
   */
  onToggleBatch?: (id: string) => void;
  /** 当前这一条已在待拖拽区：那颗按钮亮成强调色、文案改成「移出」 */
  batched?: boolean;
  /**
   * 删除当前视频的请求：只应打开二次确认层，不在这里直接删；
   * 不传则 header 没有删除按钮，`Delete` 键也不触发。
   */
  onRequestDelete?: ((id: string) => void) | null;
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
  /**
   * 这一窗是谁：页面打开的（默认）收起时要关掉页面状态；
   * 程序坞自己恢复出来的窗口传 `dock`，再收起只是回到图标。
   */
  dockOrigin?: 'page' | 'dock';
  /**
   * 程序坞条目 id：程序坞恢复出来的窗口传稳定 id，窗内换段不换根节点，
   * 收起动画才能继续找得到框体；页面弹窗不传，按当前视频生成。
   */
  dockId?: string;
};
