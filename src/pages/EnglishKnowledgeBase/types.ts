/**
 * 知识库模块的类型定义。
 * 数据来源为 learn-english 仓库的 `learning-records/` 与 `mastered-learning-records/`，
 * 由 Vite 中间件合并、按更新时间倒序后下发（见 `docs/local-repo-data.md`）。
 */

/** 记录状态：学习中的两级 + 已掌握 */
export type RecordStatus = 'familiar' | 'learning' | 'mastered';

/** 一条分类：键与中文标题都来自记录仓库的笔记分类清单，本项目不维护第二份 */
export type RecordCategory = {
  /** 分类键，如 grammar */
  key: string;
  /** 分类中文名，如 语法 */
  label: string;
  /** 记录仓库声明该分类不在页面展示（如套题 paper） */
  hidden?: boolean;
};

/** 列表里的一条记录摘要：正文不随列表下发 */
export type RecordSummary = {
  /** 记录 ID，如 `grammar:present-perfect` */
  id: string;
  /** 分类键 */
  categoryKey: string;
  /** 知识点标题 */
  title: string;
  /** 当前状态 */
  status: RecordStatus;
  /** 最近更新时间（ISO 8601），缺失为空串 */
  updatedAt: string;
  /** 掌握分 0–10；未评过分为 null */
  masteryScore: number | null;
  /** 已掌握记录的连续满分抽查次数；学习中的记录没有这个计数，为 null */
  masteredTenStreak: number | null;
  /** 下次复习时间；已掌握或未排期为 null */
  nextReviewAt: string | null;
};

/** 一条逐次复习记录 */
export type ReviewHistoryEntry = {
  /** 得分 0–10 */
  score: number;
  /** 复习时间（ISO 8601） */
  reviewedAt: string;
  /** 复习前状态 */
  previousStatus: string;
  /** 复习后状态 */
  newStatus: string;
};

/** 摘要 + 详情：只在点开某一条时取 */
export type RecordDetail = RecordSummary & {
  /** 讲解 */
  explanation: string;
  /** 代表例句 */
  source: string;
  /** 纠正 / 示例句 */
  example: string;
  /** 标签 */
  tags: string[];
  /** 首次学习时间 */
  firstLearnedAt: string | null;
  /** 最近学习时间 */
  lastLearnedAt: string | null;
  /** 累计学习次数 */
  learnedCount: number;
  /** 累计复习次数 */
  reviewCount: number;
  /** 掌握时间；学习中为 null */
  masteredAt: string | null;
  /** 遗忘次数 */
  lapseCount: number;
  /** 逐次复习记录，新的在前 */
  reviewHistory: ReviewHistoryEntry[];
};

/** 一次读取得到的记录集合 */
export type ReviewSnapshot = {
  /** 全部记录摘要，按更新时间倒序（新的在前） */
  records: RecordSummary[];
  /** 分类清单 */
  categories: RecordCategory[];
};

/** 删除结果里的一次提交 */
export type RecordCommit = {
  /** 提交短 hash */
  hash?: string;
  /** 提交标题 */
  subject?: string;
  /** 提交失败原因 */
  error?: string;
  /** 是否推送成功 */
  pushed?: boolean;
  /** 没有推送成的原因 */
  pushError?: string;
};

/** 一条记录被删除后返回的信息 */
export type DeletedRecord = {
  /** 记录 ID */
  id: string;
  /** 分类键 */
  category: string;
  /** 删除前标题 */
  title: string;
  /** 删除前状态 */
  status: RecordStatus;
  /** 被改动的记录文件，如 learning-records/grammar.json */
  file: string;
  /** 同知识点的笔记仍在时的路径；笔记没有动 */
  noteFile: string | null;
};

/** 删除接口的返回 */
export type DeleteRecordResult = {
  record: DeletedRecord;
  commit: RecordCommit;
};

/** 知识库取数 hook 的返回 */
export type UseReviewRecordsResult = {
  /** 记录摘要，按更新时间倒序 */
  records: RecordSummary[];
  /** 分类清单 */
  categories: RecordCategory[];
  /** 首次加载中 */
  loading: boolean;
  /** 读取失败原因 */
  error: string | null;
  /** 手动刷新（显示 loading） */
  refresh: () => void;
  /** 静默刷新，供页面级刷新订阅 */
  reload: () => Promise<void>;
  /** 删除一条后从列表摘掉 */
  removeRecord: (id: string) => void;
};
