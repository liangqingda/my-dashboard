import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

/**
 * 渲染链的插件表：全站只有这一份。
 * 固定引用、不在渲染时重建数组——每次换新数组都要让 `react-markdown` 重新组装一遍解析链。
 */
export const REMARK_PLUGINS = [remarkGfm];

export const REHYPE_PLUGINS = [rehypeRaw];
