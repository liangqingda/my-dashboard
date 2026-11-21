/**
 * Markdown 预览弹窗的常量：提示时长、无编辑器提示与固定渲染插件。
 */

import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import type {
  AnchorLinkBehavior,
  AnchorNavScope,
  DetailsBlockBehavior,
  DetailsNavScope,
} from './types';

/** 「已保存」提示停留时长（毫秒） */
export const SAVED_HINT_DURATION = 3000;

/**
 * 全屏预览偏好存在 localStorage 的键：全屏是「怎么看」，不是某一篇的属性，
 * 换篇、关掉重开、刷新页面后都保持上次的样子。
 */
export const FULLSCREEN_STORAGE_KEY = 'my-dashboard:markdown-preview:fullscreen';

/**
 * 正文字号微调存在 localStorage 的键：存的只是「比各模式默认字号再大 / 小多少 px」这一段，
 * 全屏自带的那 2px 由 CSS 负责（见 index.scss 的 `--prose-grow`），两者互不覆盖。
 */
export const PROSE_FONT_STORAGE_KEY =
  'my-dashboard:markdown-preview:prose-font-offset';

/** 正文字号微调的步长（px）：点一下加减一档 */
export const PROSE_FONT_STEP = 1;

/** 微调下限（px）：最多比默认字号小 2px */
export const PROSE_FONT_MIN = -2;

/** 微调上限（px）：最多比默认字号大 6px */
export const PROSE_FONT_MAX = 6;

/** 没有定制编辑器时的提示：告诉用户可以去定制，而不是不给入口 */
export const NO_EDITOR_MESSAGE =
  '这类 Markdown 还没有定制编辑器。用 personalize-edit-markdown skill 可以为它写一套编辑逻辑。';

/** 「编辑中不能关闭」提示的固定 id：连按 Esc 只会刷新同一条，不叠一屏 */
export const CLOSE_BLOCKED_NOTIFICATION_ID = 'markdown-preview-close-blocked';

/** 快捷键复制相对路径成功提示的固定 id：连按不叠一屏 */
export const COPY_SUCCESS_NOTICE_ID = 'markdown-preview-copy-success';

/** 刷新成功提示的固定 id：连按不叠一屏 */
export const REFRESH_SUCCESS_NOTICE_ID = 'markdown-preview-refresh-success';

/** 刷新成功提示停留时长（毫秒）：与页面刷新的「已刷新」同一档 */
export const REFRESH_NOTICE_DURATION = 3000;

/** 编辑态想关弹窗时的提示：说清出口在哪，而不是让按键像坏了一样没反应 */
export const CLOSE_BLOCKED_EDITING_MESSAGE =
'先点 header 的返回箭头退出编辑，关闭按钮就回来了。';

/** 草稿预览态想关弹窗时的提示：这时返回箭头是「回到编辑」，不是退出编辑 */
export const CLOSE_BLOCKED_PREVIEWING_MESSAGE =
'现在是草稿预览：先点「返回编辑」回到编辑器，再退出编辑才能关闭。';

/** 固定引用，避免每次渲染重建插件数组 */
export const REMARK_PLUGINS = [remarkGfm];

export const REHYPE_PLUGINS = [rehypeRaw];

/** 文档内参与标题目录的标题层级 */
export const HEADING_SELECTOR = 'h1, h2, h3, h4';

/** 判定「已滚到某个标题」的参考线：正文区顶边往下 16px 内的标题算作当前小节 */
export const ACTIVE_HEADING_OFFSET = 16;

/**
 * 同文档锚点链接的点击行为放在 localStorage 的键：属于「怎么看链接」的阅读偏好，
 * 换篇、关掉重开、刷新页面后都保持上次的样子。
 */
export const ANCHOR_LINK_STORAGE_KEY = 'my-dashboard:markdown-preview:anchor-link';

/** 子区域预览前后切换口径的存储键 */
export const ANCHOR_NAV_SCOPE_STORAGE_KEY =
  'my-dashboard:markdown-preview:anchor-nav-scope';

/** 可选的两种切换口径：全文所有链接 / 只同一处目录里的链接 */
export const ANCHOR_NAV_SCOPES: readonly AnchorNavScope[] = ['all', 'section'];

/** 默认切换口径：按链接顺序切换全文所有区块（等于旧行为） */
export const DEFAULT_ANCHOR_NAV_SCOPE: AnchorNavScope = 'all';

/** 可选的两档行为：跳过去 / 弹窗打开那一块 */
export const ANCHOR_LINK_BEHAVIORS: readonly AnchorLinkBehavior[] = [
  'jump',
  'modal',
];

/** 默认沿用原有行为：在当前正文里跳过去 */
export const DEFAULT_ANCHOR_LINK_BEHAVIOR: AnchorLinkBehavior = 'jump';

/**
 * 折叠块（`<details>`）里那段内容的点击行为放在 localStorage 的键：与链接一样是
 * 「怎么看文档里的东西」的阅读偏好，换篇、关掉重开、刷新页面后都保持上次的样子。
 */
export const DETAILS_BLOCK_STORAGE_KEY =
  'my-dashboard:markdown-preview:details-block';

/** 可选的两档折叠块行为：原地展开 / 弹窗预览 */
export const DETAILS_BLOCK_BEHAVIORS: readonly DetailsBlockBehavior[] = [
  'expand',
  'modal',
];

/** 默认沿用原有行为：点了就在正文里展开 */
export const DEFAULT_DETAILS_BLOCK_BEHAVIOR: DetailsBlockBehavior = 'expand';

/**
 * 折叠块子预览的前后切换口径放在 localStorage 的键：与链接那份并列，
 * 都是「怎么看文档里的东西」的阅读偏好。
 */
export const DETAILS_NAV_SCOPE_STORAGE_KEY =
  'my-dashboard:markdown-preview:details-scope';

/** 可选的三种折叠块切换口径：全文所有原文 / 全文同类原文 / 同一小节 */
export const DETAILS_NAV_SCOPES: readonly DetailsNavScope[] = [
  'all',
  'kind',
  'section',
];

/** 默认只切同一小节：范围最可控，读原文时不会跳到别的标题下 */
export const DEFAULT_DETAILS_NAV_SCOPE: DetailsNavScope = 'section';
