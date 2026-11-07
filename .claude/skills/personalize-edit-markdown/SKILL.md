---
name: personalize-edit-markdown
description: 为某一类 Markdown 文档定制「就地编辑」能力。当某个页面的 Markdown 预览弹窗（src/components/MarkdownPreviewModal）需要编辑、而当前还没有定制编辑器、或现有定制编辑器撑不住新文档结构时使用。负责把这一类文档的解析 / 编辑 / 回写逻辑做进它自己的 feature 目录，并把定制编辑器接到弹窗的 Editor 插槽。
---

# personalize-edit-markdown

公共预览弹窗故意**不带任何默认编辑器**：它只管预览、导航、编辑态与保存流程，具体「这种文档怎么改」交给调用方。
所以新页面的 md 点「编辑」时不会瞎猜结构，只会提示用本 skill 去定制。你的工作就是把那一类的编辑逻辑补齐。

## 先认清职责边界

| 位置 | 负责 | 不负责 |
|---|---|---|
| `src/components/MarkdownPreviewModal` | 预览渲染、上一篇/下一篇、标题目录、footer、编辑态开关、保存与「已保存」提示 | 任何文档结构假设、解析、回写 |
| `<feature>/<xxx>-editor`（你来建） | 把正文变成可编辑界面、把编辑结果拼回 Markdown | 弹窗、按钮、保存落盘 |
| 页面 | 组织数据、`onSave` 落盘、把 `Editor` 传给弹窗 | 文档解析 |

契约（由公共组件导出，直接复用，别自己再定义一份）：

```ts
// 来自 @/components/MarkdownPreviewModal
export type MarkdownEditorProps = {
  /** 进入编辑时的正文快照 */
  markdown: string;
  /** 编辑过程中的草稿；弹窗保存时取最后一次的值 */
  onChange: (markdown: string) => void;
};
```

- 组件进入编辑态时把 `markdown` 给你，此后你每次改动调 `onChange(最新全文)`。
- 弹窗保存 = 调页面传的 `onSave(草稿)`，成功回到预览态并显示「已保存・HH:MM」；失败停在编辑态、把错误显示在 footer。
- 你**不需要**也不该自己渲染 Modal、按钮、滚动容器（滚动容器由你的编辑器根节点自己撑起来，参考 `note-editor/index.scss`）。

## 步骤

1. **读参考实现**：`src/features/english-notes/note-editor`（适配层）、`block-editor`（受控控件）、`markdown-blocks.ts`（解析 + 序列化）。这三者合起来就是一套完整样例：块级切分、表格矩阵编辑、按模板重拼。
2. **定结构**：先看目标 md 里真实出现哪些结构（标题、段落、列表、管道表、HTML 表格、`<details>`、代码围栏、frontmatter、图片、内联 HTML）。只给「需要结构化编辑」的结构做控件，其余一律按源码文本块编辑——**宁可让用户改源码，也不要猜错结构**。
3. **建目录**：编辑逻辑放进该文档所属的 feature，例如
   - `src/features/<feature>/<xxx>-editor/index.tsx` + `index.scss`（适配层，`MarkdownEditorProps` 入参）
   - 需要的纯逻辑放同目录或 `src/features/<feature>/<xxx>-blocks.ts`
   - 复用已有的块级控件时从 `@/features/english-notes/block-editor` 引，不要复制粘贴一份
   - 目录名 kebab-case、组件目录必须有 `index.scss`、feature 内不得出现 `components/` 目录（`pnpm check:features` 会拦）
4. **接进页面**：给 `<MarkdownPreviewModal>` 传 `Editor={<XxxEditor />}`。属性按字母序排（`Editor` 排最前），`onSave` 与它配套出现；只读场景不要传 `onSave`。
5. **守住数据安全**（最重要）：
   - 解析器遇到**自己不认识的写法**（单元格里嵌了标签、表格带 `<thead>/<tbody>`、`<tr>` 带属性、嵌套表格、非常见围栏）必须**降级成源码文本块**，绝不能重新拼装后丢掉或转义掉原有标签。
   - 序列化要保证「读进来再写回去，格式不被无故重排」；做不到就降级。
6. **用真实文件验证往返**，不要靠读代码推断：

   ```bash
   node --experimental-strip-types /tmp/roundtrip.mts   # import 你的 parse / serialize
   # 原文 → parse → serialize → 与原文 diff，必须为空；再模拟删一行/加一行，diff 只出现在该行
   ```

   注意必须用**绝对路径** import（脚本在 `/tmp` 时相对路径会解析错），Node 22 需带 `--experimental-strip-types`。
7. **校验**：`pnpm typecheck`、`pnpm exec eslint <改动路径>`、`pnpm build`。前端视觉改动按用户偏好不做浏览器实测。
8. **提交**：`git add` 只加本次改动，提交信息一句话说清「给哪类 md 加了定制编辑」。

## 已知坑（踩过）

- `src/components/**` 的目录与文件名必须 **PascalCase**；`src/features/**` 必须 kebab-case。序列化逻辑如果放在 `src/components/` 下会因文件名规则报错，放 `src/utils`（kebab-case）或 feature 里更省事。
- `no-restricted-syntax` 禁止 `push/sort/splice/...`，用展开、`toSorted()`、`reduce`、`flatMap` 代替。
- `curly` 要求 `if (...) { return; }` 带花括号；`react/jsx-sort-props` 要求属性字母序（大写开头的 `Editor` 在前）。
- `react-hooks/set-state-in-effect` 禁止在 effect 里同步 setState：初始块列表用 `useState(() => parse(markdown))`，不要在 `useEffect` 里灌。
- 组件单文件 `max-lines` 上限 490 行，编辑控件拆成独立目录，别塞回弹窗。
- 不要走 contentEditable + DOM 反向序列化（历史方案，会丢格式、与 React 抢 DOM、并让编辑内容在父级刷新时当场消失）。

## 验收清单

- [ ] 点「编辑」进入的是这类文档的定制界面，不是通知提示
- [ ] 真实文件 parse → serialize diff 为空
- [ ] 改一处只有一处变化；删行 / 加行只影响目标行
- [ ] 不认识的写法降级为源码编辑，原标签没被转义或吞掉
- [ ] `pnpm typecheck` / `eslint` / `pnpm build` 全绿
- [ ] 没有把编辑逻辑塞回 `src/components/MarkdownPreviewModal`
