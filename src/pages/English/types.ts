/**
 * 英语笔记模块的类型定义。
 * 笔记来源为 learn-english 仓库的 learning-record-notes/*.md。
 */

/** 一篇学习笔记 */
export type EnglishNote = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最后修改时间（ISO 8601） */
  updatedAt: string;
};

/** 一次读取得到的笔记集合 */
export type EnglishNotesSnapshot = {
  /** 全部笔记，按最后修改时间倒序 */
  notes: EnglishNote[];
};

/** 笔记文件名里的分类前缀与中文标题 */
export type NoteCategory = {
  /** 文件名前缀，如 errors */
  key: string;
  /** 列标题 */
  label: string;
};

/** 看板的一列：分类 + 该列按文件名排序的笔记 */
export type NoteColumn = NoteCategory & {
  /** 本列笔记，按文件名排序；空列也会返回，方便区分「整目录为空」与「这列为空」 */
  notes: EnglishNote[];
};

/** 保存后自动提交到记录仓库的结果 */
export type SavedNoteResult = {
  /** 自动提交失败的原因；成功或没有可提交内容时为空 */
  commitError?: string;
  /** 自动提交的短 hash */
  commitHash?: string;
};

/** 笔记读取 hook 暴露的状态 */
export type UseEnglishNotesResult = {
  /** 全部笔记，按最后修改时间倒序 */
  notes: EnglishNote[];
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因 */
  error: string | null;
  /** 重新读取一次（带动画与 loading 态） */
  refresh: () => void;
  /** 静默重新读取全部笔记：不改 loading，用于侧边栏刷新 */
  reload: () => Promise<void>;
  /** 用单篇笔记的最新内容替换列表里的那一条（不在列表里就插到最前） */
  applyNote: (note: EnglishNote) => void;
};

/** 表格单元格 */
export type MarkdownTableCell = {
  /** 稳定 id，编辑期间不随内容变化，用作 React key */
  id: string;
  /** td / th */
  tag: 'td' | 'th';
  /** 单元格上原有的属性串，一般是空串 */
  attrs: string;
  /** 单元格纯文本（实体已解码） */
  text: string;
};

/** 表格行 */
export type MarkdownTableRow = {
  /** 稳定 id */
  id: string;
  /** 本行的单元格 */
  cells: MarkdownTableCell[];
};

/** HTML 表格块 */
export type MarkdownTableBlock = {
  /** 稳定 id */
  id: string;
  /** 块类型 */
  type: 'table';
  /** 与前一块之间保留的空行数，回写时原样还原 */
  gapBefore: number;
  /** `<table` 与 `>` 之间的属性串 */
  attrs: string;
  /** `<colgroup>…</colgroup>` 原文，没有则为空串 */
  colgroup: string;
  /** 表格的行 */
  rows: MarkdownTableRow[];
};

/** 文本块：除表格之外的 Markdown / HTML 片段 */
export type MarkdownTextBlock = {
  /** 稳定 id */
  id: string;
  /** 块类型 */
  type: 'text';
  /** 与前一块之间保留的空行数，回写时原样还原 */
  gapBefore: number;
  /** 该块的源文本 */
  source: string;
};

/** 一篇笔记被切分后的块 */
export type MarkdownBlock = MarkdownTableBlock | MarkdownTextBlock;

/** 全部笔记接口的原始 payload（由 Vite 插件生成，字段类型未知需归一化） */
export type RawNotesPayload = {
  /** 笔记列表 */
  notes: unknown;
};

/** 单篇笔记接口的原始 payload */
export type RawNotePayload = {
  /** 一篇笔记 */
  note: unknown;
};
