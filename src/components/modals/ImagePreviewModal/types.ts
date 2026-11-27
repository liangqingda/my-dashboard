/**
 * 图片预览弹窗的契约：与视频预览同形——当前目录的图片列表 + 当前一张的整图，另加裁剪。
 *
 * 弹窗只负责「裁哪一块、怎么编码」；把结果写到哪（替换源文件 / 另存到新目录）由调用方实现，
 * 本组件不知道文件系统长什么样。
 */

import type { PreviewItem } from '@/components/modals/PreviewItemList/types';

/** 一条可预览的图片 */
export type ImagePreviewItem = PreviewItem & {
  /** 图片地址（中间件整份返回字节） */
  src: string;
};

/** 裁剪的保存方式：覆盖源文件 / 另存到同级的「- 裁剪」目录 */
export type ImageCropMode = 'replace' | 'copy';

/** 保存一张裁剪结果：路径、编码后的图与保存方式 */
export type ImageCropRequest = {
  /** 源文件绝对路径（`items` 里的 id） */
  path: string;
  /** 裁剪结果的 data URL（PNG / JPEG / WebP，与源扩展名一致） */
  dataUrl: string;
  /** 保存方式 */
  mode: ImageCropMode;
};

/** 裁剪落盘后的回执：调用方按它拼提示，弹窗不碰存储细节 */
export type ImageCropResult = {
  /** 落盘后的绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 所在目录；另存时是新建的「- 裁剪」目录 */
  dir: string;
  /** 实际使用的保存方式 */
  mode: ImageCropMode;
};

/** 图片预览弹窗的入参 */
export type ImagePreviewModalProps = {
  /** 是否打开 */
  opened: boolean;
  /** 当前目录的图片（顺序即翻篇顺序） */
  items: readonly ImagePreviewItem[];
  /** 当前条目 id；不在 `items` 里时组件不渲染内容 */
  activeId: string | null;
  /** 上层浮层（删除确认）开着：整组快捷键与焦点陷阱交给那一层，header 也恒可见 */
  blocked?: boolean;
  /** 关闭（内部会先退出整屏） */
  onClose: () => void;
  /** 切到某一张（翻篇与列表点选共用） */
  onSelect: (id: string) => void;
  /**
   * 保存裁剪结果；不传则 header 没有裁剪与裁剪设置入口。
   * 真正写盘归调用方，抛错由弹窗提示「保存失败」。
   */
  onCrop?: (request: ImageCropRequest) => Promise<ImageCropResult>;
  /** 请求删除当前图片：只应打开二次确认层；不传则没有删除按钮与删除键 */
  onRequestDelete?: (() => void) | null;
  /** 请求把当前图片设为桌面墙纸：只应打开二次确认层；不传则 header 没有这颗按钮 */
  onRequestWallpaper?: (() => void) | null;
  /**
   * 请求把当前图片加入 / 移出调用方的待拖拽区（批量拖走用），进入哪个方向由 `batched` 说；
   * 不传则 header 没有这颗按钮。弹窗只报「动这一张」，攒起来的那批归调用方，翻篇与关闭都不动它。
   */
  onToggleBatch?: (() => void) | null;
  /** 当前这张已经在待拖拽区里：那颗按钮亮成强调色，再点一次就是移出 */
  batched?: boolean;
  /** 打开时直接进整屏全屏（文件页设置项）；拿不到用户手势时静默停在这个尺寸 */
  defaultFullscreen?: boolean;
  /** 页面标识（对应路由）：裁剪保存方式存在 `<标识>:image-preview` 里，组件不写死是哪一页 */
  storageScope: string;
  /**
   * 切换序号：由持有 `activeId` 的那一层报（翻篇 / 列表点选 / 删除后顺位切换都会加一），
   * 弹窗只把它转给左上角的计数浮标；打开与关窗时归零。
   */
  switchTick: number;
};
