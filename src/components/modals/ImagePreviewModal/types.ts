/**
 * 图片预览弹窗的契约：与视频预览同形——左侧列当前目录的图片，右侧看当前一张。
 */

import type { PreviewSidebarItem } from '@/components/modals/PreviewSidebar/types';

/** 一条可预览的图片 */
export type ImagePreviewItem = PreviewSidebarItem & {
  /** 图片地址（中间件整份返回字节） */
  src: string;
};

/** 图片预览弹窗的入参 */
export type ImagePreviewModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 当前目录的图片（顺序即翻篇顺序） */
  items: readonly ImagePreviewItem[];
  /** 当前条目 id；不在 `items` 里时组件不渲染内容 */
  activeId: string | null;
  /** 上层浮层（删除确认）开着：整组快捷键与焦点陷阱交给那一层 */
  blocked?: boolean;
  /** 关闭（内部会先退出整屏） */
  onClose: () => void;
  /** 切到某一张（翻篇与侧栏点选共用） */
  onSelect: (id: string) => void;
  /** 请求删除当前图片：只应打开二次确认层；不传则没有删除按钮与删除键 */
  onRequestDelete?: (() => void) | null;
  /** 请求把当前图片设为桌面墙纸：只应打开二次确认层；不传则 header 没有这颗按钮 */
  onRequestWallpaper?: (() => void) | null;
  /** 打开时直接进整屏全屏（文件页设置项）；拿不到用户手势时静默停在这个尺寸 */
  defaultFullscreen?: boolean;
};
