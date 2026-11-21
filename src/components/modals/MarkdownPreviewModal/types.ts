/**
 * Markdown 预览弹窗的类型契约：调用方传什么、编辑器插槽收什么。
 */

import type { ComponentType, MouseEvent } from 'react';

import type {
  MarkdownOutlineHeading,
  MarkdownOutlineNode,
} from '@/utils/markdown-outline';

import type { ProseFontScale } from './hooks/useProseFontScale';
import type {
  MarkdownFilterNavigation,
  MarkdownPreviewFilter,
} from './types/filter';

/**
 * 定制编辑器可选实现的能力：按标题目录的下标把自己那一节滚进视野。
 * 编辑态正文不渲染，目录没法靠 `scrollIntoView` 找标题，只能由编辑器自己定位；
 * 不实现时编辑态点目录没有反应（预览态不受影响）。
 */
export type MarkdownEditorHandle = {
  /**
   * 定位到正文里第 index 个 h1–h4（与标题目录的下标一致）。
   *
   * @param index 标题下标，从 0 开始
   * @returns 是否定位到；找不到时返回 false，弹窗不额外提示
   */
  revealHeading: (index: number) => boolean;
};

/** 定制编辑器收到的入参与出口：正文快照 + 草稿回传 */
export type MarkdownEditorProps = {
  /** 进入编辑时的正文快照 */
  markdown: string;
  /** 编辑过程中的草稿；弹窗保存时取最后一次的值 */
  onChange: (markdown: string) => void;
  /**
   * 可选：编辑器把自己的定位能力交上来，供编辑态的标题目录调用。
   * 每次块变动（内容改了、标题位置变了）都要重新交一份；卸载时交 null。
   * 不实现则编辑态点目录没有反应，预览态不受影响。
   */
  onHandleReady?: (handle: MarkdownEditorHandle | null) => void;
};

/** 正文字号调节的入参：字号状态整包来自 `useProseFontScale`，按钮只管弹层与呈现 */
export type ProseFontControlProps = {
  /** 当前偏移与加减 / 复位动作 */
  scale: ProseFontScale;
  /** 弹层是否打开 */
  opened: boolean;
  /** 弹层开合（点图标、点外部、Esc 都会走到这里） */
  onChange: (opened: boolean) => void;
  /** 触发字号面板的快捷键（如 `A`）：tooltip 末尾追加键位；没有快捷键就不传 */
  shortcut?: string;
};

/** header 的就近弹层：同一时刻只开一块 */
export type PreviewPanel = 'filter' | 'font' | 'interaction';

/** 预览弹窗的对外 props */
export type MarkdownPreviewModalProps = {
  /** 是否打开预览 */
  opened: boolean;
  /** 标题，通常是文件名 */
  title: string;
  /** Markdown 原文 */
  markdown: string;
  /**
   * 正文是否还在取。为 true 时正文区显示加载态、不渲染 Markdown，
   * 目录为空，刷新与编辑入口一并收起（没有正文可编辑，也不该把 `markdown` 的空串写成一篇空文档）。
   * 打开、翻篇、刷新都会经过这个状态，调用方按自己的取数时机传。
   */
  loading?: boolean;
  /** 当前位置，如第 3 / 12 篇 */
  position?: { index: number; total: number };
  /**
   * 文档的相对路径（相对它所在记录仓库的根目录，如
   * `learning-record-notes/errors-back-west-spacing.md`）。
   * 提供后 header 右侧才出现复制图标按钮，点一下把这串路径写进剪贴板；
   * 组件不知道文件落在哪里，路径由调用方给。
   */
  relativePath?: string;
  /** 关闭预览 */
  onClose: () => void;
  /** 上一篇；null 表示没有相邻文档 */
  onPrevious?: (() => void) | null;
  /** 下一篇；null 表示没有相邻文档 */
  onNext?: (() => void) | null;
  /**
   * header 刷新：调用方重新取一次最新正文并回灌 markdown。
   * 返回 Promise 时按钮显示 loading 直到结束；不提供则不显示刷新按钮。
   */
  onRefresh?: (() => Promise<void> | void) | null;
  /** 保存编辑后的 Markdown；提供后 header 才会出现「编辑」图标按钮 */
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
  /**
   * 这一类 Markdown 的定制编辑器。不传则点「编辑」只给出定制提示——
   * 通用组件不假设任何文档结构，编辑逻辑归调用方（见 personalize-edit-markdown）。
   */
  Editor?: ComponentType<MarkdownEditorProps>;
  /**
   * 预览态的内容筛选（关键词、只看某一类小节…）。不传就不出现筛选按钮。
   * 筛选只作用在「读」：编辑态与保存永远用未筛选的原文，避免把筛过的正文写回文件。
   */
  filter?: MarkdownPreviewFilter;
  /**
   * 删除这篇文档。不传就没有删除按钮——删什么、删完怎么刷新都由调用方决定，
   * 弹窗只负责「点一下先问一遍」这一层。
   */
  remove?: MarkdownPreviewRemove;
};

/**
 * 删除这篇文档：二次确认的说明与真正删除的动作都由调用方给。
 *
 * 组件不知道文档落在哪里，也不知道删一篇会牵连哪些东西（学习记录、提交、推送），
 * 所以只收人话：确认层里说什么、左下角列哪几个「这次删什么」的勾选项，
 * 以及用户点「删除」之后做什么。
 */
export type MarkdownPreviewRemove = {
  /**
   * 二次确认里的说明：删掉会发生什么。
   * 传函数时按当前勾中的 key 现算——勾选项一变，说明块跟着变。
   */
  description: string | ((checkedKeys: readonly string[]) => string);
  /**
   * 可选：说明块下方的勾选项（紧凑一行，hover 出 tooltip）。没有可选的就不传，
   * 也不出勾选这一块，`confirm` 收到的就是空数组。
   */
  choices?: readonly MarkdownPreviewRemoveChoice[];
  /** 用户确认后执行；参数是勾中的 choice key（没勾任何一项时按钮不可点） */
  confirm: (checkedKeys: readonly string[]) => Promise<void>;
};

/**
 * 删除确认层的一个勾选项：勾上就代表「这次删它」。
 *
 * 组件不解释这个 key「意味着什么」——文案与勾选后的动作都由调用方给，
 * 它只负责画 checkbox（只有 `label` 一个词，细节挂在 hover 的 tooltip 上）
 * 与把勾中的 key 集合带进 `confirm`。
 */
export type MarkdownPreviewRemoveChoice = {
  /** 稳定标识，随 `confirm` 回给调用方（如 `markdown` / `record`） */
  key: string;
  /** 主提示（就一个词，如「Markdown」「Record」） */
  label: string;
  /** hover 时用 tooltip 补一句这一项指的是什么；不传就不出 tooltip */
  hint?: string;
  /** 初始是否勾选；默认不勾，每次打开确认层都回到这里 */
  defaultChecked?: boolean;
};

/** 删除请求的入参：只认调用方给的那一份删除能力 */
export type RemoveRequestParams = {
  /** 调用方提供的删除能力；不提供时按钮根本不渲染 */
  remove?: MarkdownPreviewRemove;
};

/** 删除快捷键的入参：预览态按 Delete 打开二次确认，不直接删 */
export type RemoveShortcutParams = {
  /** 是否响应按键：预览态、有删除能力、且没有别的浮层占着键盘时才开 */
  enabled: boolean;
  /** 打开二次确认层（与点 header 的删除按钮同一条路） */
  onRequest: () => void;
};

/** 删除确认层的入参 */
export type DeleteConfirmProps = {
  /** 是否打开 */
  opened: boolean;
  /** 文档标题：确认层标题里点名删的是哪一篇 */
  title: string;
  /** 删掉会发生什么，由调用方给（函数形式按当前勾选现算） */
  description: string | ((checkedKeys: readonly string[]) => string);
  /** 说明块下方的勾选项；不传就只有说明块与两个出口 */
  choices?: readonly MarkdownPreviewRemoveChoice[];
  /** 当前勾中的 key（状态由弹窗持有，每次打开确认层回到各自的默认值） */
  checkedKeys: readonly string[];
  /** 勾选集合变化 */
  onCheckedKeysChange: (keys: string[]) => void;
  /** 是否正在删：按钮显示 loading，取消、勾选与 Esc 暂时不可用 */
  loading: boolean;
  /** 取消删除 */
  onCancel: () => void;
  /** 确认删除 */
  onConfirm: () => void;
};

/**
 * 同文档锚点链接的点击行为：`jump` 在当前正文里滚过去，
 * `modal` 把链接指向的那一节内容单独开窗预览。
 */
export type AnchorLinkBehavior = 'jump' | 'modal';

/**
 * 子区域预览的前后切换口径：`all` 按链接顺序切换全文所有链接指向的区块，
 * `section` 只切换「同一处目录里的那几个链接」指向的区块（计数就是这一处的链接数）。
 * 例：`## 讲解` 里列了两轮复习的链接，选 `section` 时计数只有 2，只能在这两个里切换。
 */
export type AnchorNavScope = 'all' | 'section';

/**
 * 折叠块子预览的前后切换口径：
 * - `all` 按正文顺序切换全文所有 `<details>`（含练习题的「知识点讲解」「错题讲解」）；
 * - `kind` 只切换**标题相同**的折叠块（去掉末尾序号再比），如各轮的「知识点讲解」、
 *   「场景对话原文 1 / 2」——读原文时不会被练习题讲解插进来；
 * - `section` 只切换「同一个标题小节下的那几个」折叠块（计数就是这一小节的块数），
 *   例：`## 看一套…场景对话` 下两个「场景对话原文」。
 */
export type DetailsNavScope = 'all' | 'kind' | 'section';

/**
 * 折叠块（`<details>`）里那段内容的点击行为：`expand` 在正文里直接展开，
 * `modal` 叠一层弹窗单独读（正文里的折叠块保持收着）。
 */
export type DetailsBlockBehavior = 'expand' | 'modal';

/**
 * 子区域预览渲染的一段内容：它不讲「这段内容打哪来」——
 * 同文档链接指向的一节与折叠块（`<details>`）里的正文都套在这个形状上，
 * 弹窗只负责把这一段读出来，翻页范围由调用方算好传进来。
 */
export type MarkdownPreviewSection = {
  /** 稳定标识：换块、记住「面板属于哪一块」都按它 */
  key: string;
  /** 区块标题（含行内标记已被剥掉）；没有标题时为空串，header 退回显示 `key` */
  title: string;
  /** 区块所处的上级标题（如「2026-11-15 12:05 · 复习」）；没有上级时为空串 */
  parentTitle: string;
  /** 区块源文本，直接交给渲染器 */
  markdown: string;
  /** 区块内的标题目录，给子区域预览弹窗的 sidebar 用 */
  headings: MarkdownOutlineHeading[];
};

/**
 * 同文档锚点链接指向的一个内容区块：某一节标题下的全部内容。
 *
 * 子区域预览弹窗一次只看一块；「跳到 h2 就展示整个 h2 小节（含 h3）」这条
 * 边界由 `collectAnchorBlocks` 算好，组件只负责渲染。
 */
export type MarkdownAnchorBlock = MarkdownPreviewSection & {
  /** 锚点 id（链接里 `#` 之后的片段，不含 `#`）；同一节被多个链接指向时取第一条 */
  anchor: string;
  /** 标题层级 1–4；区块边界按它算（到下一个同级或更高级标题为止），没有标题时为 0 */
  level: number;
  /**
   * 指向这一块的链接所在的上级标题行号（-1 表示在第一个标题之前）。
   * 同值就是「同一处目录里的链接」，`section` 口径按它分组，前后切换不出这一组。
   */
  linkGroup: number;
  /** 区块首行在整篇里的行号：按它排正文顺序 */
  startLine: number;
};

/**
 * 折叠块（`<details><summary>…</summary>…</details>`）里的一段内容。
 *
 * 与锚点区块同一副形状（`MarkdownPreviewSection`），所以共用同一层子区域预览：
 * header 只显示 summary 那句话，正文是 summary 之下、`</details>` 之前的全部内容
 * （里面再套的折叠块原样留着，在子预览里按浏览器默认行为展开）。
 */
export type MarkdownDetailBlock = MarkdownPreviewSection & {
  /**
   * 这一块所属小节的标题行号（-1 表示在第一个标题之前）：
   * 折叠块就是「它上面最近的那个 h1–h4」，同值即同一个分组，`section` 口径按它分组。
   */
  groupLine: number;
  /**
   * 去掉末尾序号之后的 summary（如「场景对话原文 1」→「场景对话原文」）：
   * 同值就是「同一类折叠块」，`kind` 口径按它分组。
   */
  titleKey: string;
};

/**
 * 「文档内交互方式」图标按钮的入参：同文档链接一组、折叠块一组。
 *
 * 文档里只有其中一类时，另一组不渲染——没有可点的东西，那一档设置也无从验证。
 */
export type InteractionControlProps = {
  /** 同文档链接的点击行为 */
  anchorBehavior: AnchorLinkBehavior;
  /** 子区域预览的前后切换口径 */
  anchorScope: AnchorNavScope;
  /** 折叠块里那段内容的点击行为 */
  detailsBehavior: DetailsBlockBehavior;
  /** 折叠块子预览的前后切换口径 */
  detailsScope: DetailsNavScope;
  /** 文档里有没有同文档锚点链接 */
  hasAnchorLinks: boolean;
  /** 文档里有没有折叠块 */
  hasDetailBlocks: boolean;
  /** 弹层是否打开 */
  opened: boolean;
  /** 弹层开合（点图标、点外部、Esc 都会走到这里） */
  onChange: (opened: boolean) => void;
  /** 选中的新链接行为；写存储归调用方 */
  onAnchorBehaviorChange: (behavior: AnchorLinkBehavior) => void;
  /** 选中的新切换口径；写存储归调用方 */
  onAnchorScopeChange: (scope: AnchorNavScope) => void;
  /** 选中的新折叠块行为；写存储归调用方 */
  onDetailsBehaviorChange: (behavior: DetailsBlockBehavior) => void;
  /** 选中的新折叠块切换口径；写存储归调用方 */
  onDetailsScopeChange: (scope: DetailsNavScope) => void;
};

/** 子区域预览的装配入参：这一段内容与「能切到哪几段」都由调用方算好 */
export type SectionPreviewProps = {
  /** 可切换的全部区块（锚点区块 / 折叠块），按正文顺序 */
  sections: readonly MarkdownPreviewSection[];
  /** 当前打开第几段；null 表示关着 */
  index: number | null;
  /**
   * 这一次能前后切换到的下标，按 `sections` 的顺序；只算得出一段时就放当前这一个。
   * 锚点区块按「同一处目录 / 全文」算，折叠块按「同一小节 / 全文」算——
   * 「哪些算一组」是文档语义，归调用方，组件不猜。
   */
  peers: readonly number[];
  /** 上一个按钮的文案，默认「上一个区块」 */
  previousLabel?: string;
  /** 下一个按钮的文案，默认「下一个区块」 */
  nextLabel?: string;
  /** 关闭子预览 */
  onClose: () => void;
  /** 换到第 index 段 */
  onIndexChange: (index: number) => void;
};

/**
 * 正文工作区的入参：目录 + 阅读 / 编辑区。
 *
 * 正文的渲染、筛选、目录与标题定位都由工作区自己算——它们只服务于「看这一篇」，
 * 弹窗不必知道中间过程；弹窗只给原文、筛选口径和阅读偏好。
 */
export type PreviewWorkspaceProps = {
  /** 要渲染的 Markdown：预览草稿时是草稿，其余时候是正文 */
  markdown: string;
  /** 正文是否还在取 */
  loading: boolean;
  /** 弹窗是否打开（没开就不跟踪滚动、也不复位） */
  opened: boolean;
  /** 文档标题：换篇时用它判断要不要把正文滚回顶部 */
  title: string;
  /** 全屏预览：目录全展开、正文放大 */
  fullscreen: boolean;
  /** 关键词匹配导航就绪后回传给弹窗层；卸载 / 无导航时回传 null */
  onHighlightNavigation?: (navigation: MarkdownFilterNavigation | null) => void;
  /** 正文字号的用户偏移（px） */
  fontOffset: number;
  /** 预览态的内容筛选；不传或编辑态就不筛 */
  filter?: MarkdownPreviewFilter;
  /** 编辑态状态机：决定编辑区出不出、草稿预览时是否只隐藏 */
  editing: NoteEditingState;
  /** 这一类文档的定制编辑器；不传就没有编辑区 */
  Editor?: ComponentType<MarkdownEditorProps>;
  /** 正文里的点击（同文档链接在弹窗这一层接管） */
  onBodyClick: (event: MouseEvent<HTMLElement>) => void;
};

/** header 操作组的入参：编辑 / 预览 / 保存 / 放弃改动与状态提示所需的状态 */
export type PreviewHeaderActionsProps = {
  /** 是否处于编辑态 */
  editing: boolean;
  /** 编辑态下是否正在预览草稿（只留「返回编辑」「保存」） */
  previewing: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败的原因 */
  saveError: string | null;
  /** 「已保存」提示的时刻 */
  savedAt: string | null;
  /** 「已保存」后追加的说明 */
  saveNotice: string | null;
  /** 是否在等用户确认放弃改动（退出编辑前） */
  askDiscard: boolean;
  /** 调用方是否提供了编辑能力 */
  canEdit: boolean;
  /** 进入编辑态 */
  onStartEdit: () => void;
  /** 退出编辑态（不写回）；有未保存改动时弹窗先转入确认，不会直接丢草稿 */
  onCancelEdit: () => void;
  /** 编辑态下预览草稿的渲染效果 */
  onStartPreview: () => void;
  /** 草稿预览态下返回编辑器 */
  onStopPreview: () => void;
  /** 保存草稿 */
  onSaveEdit: () => void;
  /** 确认放弃改动并退出编辑 */
  onDiscard: () => void;
  /** 取消放弃，继续编辑 */
  onKeepEditing: () => void;
};

/** 标题目录 sidebar 的入参 */
export type OutlineNavProps = {
  /** 文档内标题列表（筛选时是未筛选的完整目录，被筛掉的项在 `hiddenIndices` 里） */
  headings: MarkdownOutlineHeading[];
  /** 这些下标对应的标题在正文里已被筛掉：置灰、点击不跳转；不传表示都在 */
  hiddenIndices?: ReadonlySet<number>;
  /** 当前小节是第几条标题（-1 表示还判不出）；用来高亮并展开所在分支 */
  activeIndex: number;
  /** 编辑态下置灰不可点 */
  disabled: boolean;
  /** 全屏预览：目录默认全部展开、列宽放宽（小的弹窗里默认只展开前两层） */
  fullscreen: boolean;
  /** 点击第几条标题 */
  onSelect: (index: number) => void;
};

/** 目录宽度偏好：收起时仍记住展开过的宽度，点窄轨能还原回去 */
export type OutlineWidthPreference = {
  /** 展开时的宽度（px）；`null` 表示还没拖过，用各模式自己的默认宽度 */
  width: number | null;
  /** 是否收起（宽度归零，只留左边一条窄轨） */
  collapsed: boolean;
};

/** 标题导航某一层的入参：渲染这一层的节点，展开时递归渲染下一层 */
export type OutlineNavListProps = {
  /** 这一层的节点 */
  nodes: MarkdownOutlineNode[];
  /** 正文里已被筛掉的标题下标：这一层的条目据此置灰 */
  hiddenIndices?: ReadonlySet<number>;
  /** 当前小节是第几条标题（-1 表示还判不出） */
  activeIndex: number;
  /** 编辑态下禁用 */
  disabled: boolean;
  /** 已展开的节点 key 集合 */
  expanded: ReadonlySet<string>;
  /** 点击标题跳转；参数是标题在正文里的下标 */
  onSelect: (index: number) => void;
  /** 点标题时顺手展开（只展开，不收起） */
  onExpand: (key: string) => void;
  /** 点右侧图标时展开 / 收起某个节点的子标题 */
  onToggle: (key: string) => void;
  /** 缩进深度，顶层为 1；每深一层多一段缩进和一条左侧引导线 */
  depth?: number;
  /** 顶层那一层额外带滚动样式；嵌套层不传 */
  className?: string;
};

/** 标题导航单条的入参 */
export type OutlineNavItemProps = {
  /** 是否就是当前所在的这一节 */
  active: boolean;
  /** 这一节在正文里已被筛掉：置灰、不可点（筛完的正文里没有它的位置） */
  hidden: boolean;
  /** 编辑态下禁用跳转 */
  disabled: boolean;
  /** 有子标题：标题右侧显示折叠图标 */
  hasChildren: boolean;
  /** 子标题当前是否展开 */
  expanded: boolean;
  /** 标题层级 1–4，决定字号 / 字重 / 颜色（缩进由 List 的引导线表示） */
  level: MarkdownOutlineHeading['level'];
  /** 点击这一条时跳转 */
  onSelect: () => void;
  /** 展开 / 收起子标题 */
  onToggle: () => void;
  /** 标题纯文本；被省略号截断时用 tip 展示完整内容 */
  text: string;
};

/** 编辑态状态机的入参 */
export type NoteEditingParams = {
  /**
   * 当前文档的身份（用标题）：保存状态提示带着它存，
   * 换一篇后标题对不上就自动失效，不用靠「换篇重挂弹窗」去清。
   */
  documentTitle: string;
  /** 当前正文；用来判断草稿是否有改动 */
  markdown: string;
  /** 是否提供了定制编辑器 */
  hasEditor: boolean;
  /** 保存落盘，由调用方实现 */
  onSave?: (markdown: string) => Promise<{ notice?: string }>;
};

/** 保存状态提示：都记着所属文档，换篇后自动失效 */
export type SaveHintState = {
  /** 这份提示所属的文档（标题）；与当前标题不一致就当作没有提示 */
  document: string;
  /** 「已保存」提示的时刻，如 20:54 */
  savedAt: string | null;
  /** 「已保存」后追加的说明，如自动提交失败原因 */
  notice: string | null;
  /** 保存失败的原因 */
  error: string | null;
};

/** 编辑态状态机暴露的状态与操作 */
export type NoteEditingState = {
  /** 是否处于编辑态 */
  editing: boolean;
  /** 编辑态下是否正在预览草稿；false 时显示编辑器 */
  previewing: boolean;
  /** 草稿与正文不一致 */
  dirty: boolean;
  /** 草稿；null 表示没在编辑 */
  draft: string | null;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败的原因 */
  saveError: string | null;
  /** 「已保存」提示的时刻，如 20:54 */
  savedAt: string | null;
  /** 提示后追加的说明，如自动提交失败原因 */
  saveNotice: string | null;
  /** 退出编辑前是否在等用户确认放弃改动 */
  askDiscard: boolean;
  /** 编辑器回传草稿 */
  setDraft: (markdown: string) => void;
  /** 进入编辑态 */
  startEditing: () => void;
  /** 退出编辑态（不写回） */
  stopEditing: () => void;
  /** 预览草稿的渲染效果（编辑态内，不丢草稿） */
  startPreview: () => void;
  /** 从草稿预览态回到编辑态 */
  stopPreview: () => void;
  /** 保存草稿 */
  save: () => Promise<void>;
  /** 退出编辑入口：有未保存改动时先在 header 里确认 */
  requestExitEditing: () => void;
  /** 确认放弃改动并退出编辑（弹窗仍开着） */
  discardAndExitEditing: () => void;
  /** 取消放弃，继续编辑 */
  keepEditing: () => void;
};

/** 翻篇导航的入参：快捷键开关 + 两个翻篇动作（都已收好 header 弹层） */
export type StepNavigationParams = {
  /** 是否启用快捷键（弹窗打开、不在编辑态、不在加载中） */
  enabled: boolean;
  /** 上一篇动作；null / 不传表示没有相邻文档 */
  onPrevious?: (() => void) | null;
  /** 下一篇动作；null / 不传表示没有相邻文档 */
  onNext?: (() => void) | null;
};

/** 关闭请求的入参：决定「照常关」还是「拦下来并提示」 */
export type CloseRequestParams = {
  /** 是否正在编辑（含草稿预览）：这时弹窗不许关，只提示 */
  blocking: boolean;
  /** 是否停在草稿预览：两种状态的出口不同，提示文案也不同 */
  previewing: boolean;
  /** 允许关闭时真正关掉弹窗（含退出全屏） */
  onClose: () => void;
};

/** 滚动定位当前小节的入参 */
export type ActiveHeadingParams = {
  /** 正文区（同时也是滚动容器）的节点；还没挂上时为 null，挂上后 effect 会自动重建监听 */
  container: HTMLElement | null;
  /** 是否启用（弹窗打开且不在编辑态） */
  enabled: boolean;
  /** 文档内标题列表：数量决定扫几个节点，引用变化表示换了一篇文档，需要重判 */
  headings: MarkdownOutlineHeading[];
};

/** header 操作快捷键的入参：a 字号 / s 筛选 / c 复制 / r 刷新 / f 全屏，各动作有能力才响应 */
export type HeaderActionShortcutParams = {
  /** 是否启用（预览态，编辑态与其它浮层都没占着键盘） */
  enabled: boolean;
  /** 开合字号面板；不传表示没有字号调节能力 */
  onToggleFont?: (() => void) | null;
  /** 开合筛选面板；不传表示没有筛选能力 */
  onToggleFilter?: (() => void) | null;
  /** 复制相对路径；不传表示没有路径可复制 */
  onCopy?: (() => void) | null;
  /** 刷新正文；不传表示没有刷新能力 */
  onRefresh?: (() => void) | null;
};
