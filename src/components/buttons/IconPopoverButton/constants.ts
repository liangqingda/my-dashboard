import type { CSSProperties } from '@mantine/core';

/**
 * 弹层面板里「标题 + 控件」的字段间距：标题下补 4px。
 *
 * 组件库只靠标题行高留白（13px 字站在 1.55 行高里），视觉上贴着控件。
 * 原来正文筛选、笔记筛选、同文档链接设置各复制一份同值常量（其中两处还分别写在
 * 页面目录与组件目录里），现在只有这一份；调这个间距只改这里。
 *
 * 放在弹层外壳旁边，是因为它管的是「弹层面板里的字段」，而不是某一个控件：
 * `FreeSelectField` 里的 `Select`、`NoteFilter` 里的 `TextInput` 用的都是它。
 */
export const PANEL_FIELD_STYLES: Record<'label', CSSProperties> = {
  label: { marginBottom: 4 },
};
