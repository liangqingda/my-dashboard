/**
 * Markdown 预览弹窗的常量：提示时长、无编辑器提示、固定渲染插件与元素映射。
 */

import type { Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import MarkdownDetails from '@/components/MarkdownDetails';

/** 「已保存」提示停留时长（毫秒） */
export const SAVED_HINT_DURATION = 3000;

/** 没有定制编辑器时的提示：告诉用户可以去定制，而不是不给入口 */
export const NO_EDITOR_MESSAGE =
  '这类 Markdown 还没有定制编辑器。用 personalize-edit-markdown skill 可以为它写一套编辑逻辑。';

/** 固定引用，避免每次渲染重建插件数组 */
export const REMARK_PLUGINS = [remarkGfm];

export const REHYPE_PLUGINS = [rehypeRaw];

/** 折叠讲解（`<details>`）交给公共组件，标题行常显、正文按需展开 */
export const MARKDOWN_COMPONENTS: Components = { details: MarkdownDetails };

/** 文档内参与标题导航的标题层级 */
export const HEADING_SELECTOR = 'h1, h2, h3, h4';
