/**
 * 英语笔记模块的类型定义。
 * 笔记来源为 learn-english 仓库的 learning-record-notes/*.md。
 */

/**
 * 列表里的一条笔记摘要：列表页只消费这些字段，正文不随列表下发。
 * 三个派生字段（分类键、知识点、更新时间）由读盘侧的插件解析好，
 * 前端不再重复扫正文（口径见 `docs/local-repo-data.md`）。
 */
export type NoteSummary = {
  /** 文件名，如 errors-back-west-spacing.md */
  name: string;
  /** 分类键，如 errors；正文记录 ID 优先，文件名兜底 */
  categoryKey: string;
  /** 目标知识点（摘自正文基础信息表）；缺失时为空串 */
  topic: string;
  /** 笔记更新时间（ISO 串）；正文里的「笔记更新时间」优先，缺失时回落文件 mtime */
  updatedAt: string;
};

/**
 * 按名取到的一篇正文。
 * 开发态接口顺带回最新摘要（保存后分类 / 知识点 / 时间可能一起变），
 * 静态快照只有正文，摘要继续用列表里那条。
 */
export type NoteBody = {
  /** 文件名 */
  name: string;
  /** Markdown 原文 */
  content: string;
  /** 最新摘要；静态快照下为 null */
  summary: NoteSummary | null;
};

/** 一次读取得到的笔记集合 */
export type EnglishNotesSnapshot = {
  /** 全部笔记摘要，按笔记更新时间倒序 */
  notes: NoteSummary[];
  /** 记录仓库声明的分类清单（键、标题、顺序、是否展示），缺失时为空数组 */
  categories: NoteCategory[];
};

/** 笔记列表的展示形式：分列看板 / 表格平铺 */
export type NotesViewMode = 'board' | 'table';

/**
 * 一个分类：键来自笔记正文的记录 ID 前缀（如 `errors:xxx` → `errors`），
 * 中文标题与顺序来自记录仓库的分类清单，本项目只负责读取。
 */
export type NoteCategory = {
  /** 分类键，如 errors */
  key: string;
  /** 列标题与表格「分类」单元格的文案 */
  label: string;
  /** 记录仓库声明该分类不在看板与表格里展示（如套题 paper）；缺省即展示 */
  hidden?: boolean;
};

/** 看板的一列：分类 + 该列按「笔记更新时间」倒序排列的笔记 */
export type NoteColumn = NoteCategory & {
  /** 本列笔记摘要，按笔记更新时间倒序（新的在前）；空列也会返回，方便区分「整目录为空」与「这列为空」 */
  notes: NoteSummary[];
};

/**
 * 一次算好、看板与表格共用的分类方案：
 * 有哪些列、每列的标题、列之间的顺序，以及某篇笔记的分类是否要在页面上展示。
 */
export type NoteCategoryPlan = {
  /** 展示用的分类列，顺序即看板列顺序与表格「分类」列的排序顺序 */
  columns: NoteCategory[];
  /** 分类键 → 中文标题 */
  labels: ReadonlyMap<string, string>;
  /** 分类键 → 在列顺序里的下标 */
  orders: ReadonlyMap<string, number>;
  /** 该分类键是否要在看板 / 表格里展示 */
  isVisible: (key: string) => boolean;
};

/** 表格平铺的一行：一行一篇笔记，分类、目标知识点和时间作为单元格内容 */
export type NoteRow = {
  /** 这一行对应的笔记摘要 */
  note: NoteSummary;
  /** 分类键，如 errors；排序按分类清单里的声明顺序 */
  categoryKey: string;
  /** 分类中文标题，如「错题」 */
  categoryLabel: string;
  /** 目标知识点（摘自正文基础信息表）；缺失时为空串 */
  topicLabel: string;
  /** 「笔记更新时间」文案；时间未知时为空串 */
  updatedLabel: string;
  /** 「笔记更新时间」时间戳（毫秒），0 表示未知；排序用 */
  updatedAt: number;
};

/** 表格可排序的列 */
export type NoteSortKey = 'category' | 'updated';

/** 升序 / 倒序 */
export type SortDirection = 'asc' | 'desc';

/** 表格当前的排序状态 */
export type NotesSort = {
  /** 按哪一列排 */
  key: NoteSortKey;
  /** 排序方向 */
  direction: SortDirection;
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
  /** 全部笔记摘要，按笔记更新时间倒序 */
  notes: NoteSummary[];
  /** 记录仓库声明的分类清单；读取失败时保留上一次的结果 */
  categories: NoteCategory[];
  /** 是否正在读取 */
  loading: boolean;
  /** 读取失败的原因 */
  error: string | null;
  /** 重新读取一次（带动画与 loading 态） */
  refresh: () => void;
  /** 静默重新读取全部笔记：不改 loading，用于侧边栏刷新 */
  reload: () => Promise<void>;
  /** 用单篇的最新摘要替换列表里的那一条（保存后分类 / 知识点 / 时间可能变；不在列表里就插到最前） */
  applySummary: (summary: NoteSummary) => void;
};

/** 当前打开的那一篇：取正文 / 保存 / 刷新共用的状态与动作（见 `hooks/useActiveNote.ts`） */
export type UseActiveNoteResult = {
  /** 当前打开的笔记摘要；null 表示弹窗关闭 */
  active: NoteSummary | null;
  /** 当前这一篇的正文；null 表示还在取（弹窗里显示加载态） */
  content: string | null;
  /** 正文是否正在取：打开、翻篇、刷新都会回到加载态 */
  loading: boolean;
  /** 按列表里的名字打开一篇 */
  open: (name: string) => Promise<void>;
  /** 关闭弹窗并清掉正文 */
  close: () => void;
  /** 保存编辑后的正文，返回值叠加在弹窗的「已保存」提示上 */
  save: (markdown: string) => Promise<{ notice?: string }>;
  /** 重取当前这一篇 */
  refresh: () => Promise<void>;
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
  /** 分类清单，可能缺失 */
  categories?: unknown;
};

/** 单篇笔记接口的原始 payload */
export type RawNotePayload = {
  /** 一篇笔记 */
  note: unknown;
};

/** 预览正文的筛选范围：全部内容 / 只看习题 / 只看错题 */
export type NoteFilterScope = 'all' | 'exercise' | 'wrong';

/** 预览正文的筛选条件：范围 + 关键词（关键词为空表示不按关键词筛） */
export type NoteFilterCondition = {
  /** 筛选范围 */
  scope: NoteFilterScope;
  /** 关键词；空串表示不按关键词筛 */
  keyword: string;
};

/** 预览筛选 hook 暴露的状态与动作（见 `hooks/useNoteFilter.ts`） */
export type UseNoteFilterResult = {
  /** 当前范围 */
  scope: NoteFilterScope;
  /** 当前关键词 */
  keyword: string;
  /** 是否有条件生效（决定弹窗图标高亮与空结果提示） */
  active: boolean;
  /** 改范围（写回 localStorage） */
  setScope: (scope: NoteFilterScope) => void;
  /** 改关键词（写回 localStorage） */
  setKeyword: (keyword: string) => void;
  /** 清空条件：回到「全部内容 + 无关键词」 */
  reset: () => void;
  /** 预览态取正文：没条件时原样返回，有条件时交给筛选函数 */
  apply: (markdown: string) => string;
};

/**
 * 列表筛选的时间范围：全部时间 / 最近 1 小时 / 最近 1 天 / 最近 1 周 /
 * 最近 1 个月 / 指定某一天。口径都按笔记更新时间算。
 */
export type NotesTimeRange = 'all' | 'hour' | 'day' | 'week' | 'month' | 'date';

/** 列表筛选条件：时间范围 + 指定日期 + 分类 */
export type NotesFilterCondition = {
  /** 时间范围 */
  range: NotesTimeRange;
  /** 指定日期，`YYYY-MM-DD`；只有 `range === 'date'` 时参与筛选，其余档位保留上次选的那天 */
  date: string;
  /** 分类键；空串表示全部分类 */
  categoryKey: string;
};

/** 列表筛选 hook 暴露的状态与动作（见 `hooks/useNotesFilter.ts`） */
export type UseNotesFilterResult = {
  /** 当前时间范围 */
  range: NotesTimeRange;
  /** 当前指定日期 */
  date: string;
  /** 当前分类键，空串表示全部分类 */
  categoryKey: string;
  /** 是否有条件生效（决定 header 筛选图标的高亮与空结果文案） */
  active: boolean;
  /** 改时间范围（写回 localStorage；切到「指定日期」时补上今天的日期） */
  setRange: (range: NotesTimeRange) => void;
  /** 改指定日期（写回 localStorage） */
  setDate: (date: string) => void;
  /** 改分类（写回 localStorage） */
  setCategoryKey: (key: string) => void;
  /** 清空条件：回到「全部时间 + 全部分类」 */
  reset: () => void;
  /** 按当前条件过滤笔记摘要：没条件时原样返回 */
  apply: (notes: NoteSummary[]) => NoteSummary[];
};
