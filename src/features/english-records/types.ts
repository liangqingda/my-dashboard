/**
 * 英语学习记录模块的类型定义。
 * 记录来源为 learn-english 仓库的 learning-records / mastered-learning-records，
 * 前端统一归一化为这里定义的扁平结构。
 */

/** 记录状态：学习中 / 熟悉 / 已掌握 */
export type RecordStatus = 'learning' | 'familiar' | 'mastered';

/** 一次复习留下的评分记录 */
export type ReviewEvent = {
  /** 本次复习得分（0–10，10 分为满分） */
  score: number;
  /** 复习时间（ISO 8601） */
  reviewedAt: string;
  /** 复习前的状态 */
  previousStatus: RecordStatus;
  /** 复习后的状态 */
  newStatus: RecordStatus;
};

/** 一条归一化后的英语学习记录 */
export type EnglishRecord = {
  /** 稳定唯一标识，如 errors:wait-后遗漏介词-for */
  id: string;
  /** 分类标识，如 errors */
  category: string;
  /** 当前状态 */
  status: RecordStatus;
  /** 知识点标题（多为中英混排的一句话） */
  title: string;
  /** 讲解正文 */
  explanation: string;
  /** 触发这条记录的原始英文输入 */
  source: string;
  /** 标准例句 */
  example: string;
  /** 标签 */
  tags: string[];
  /** 首次学习时间（ISO 8601） */
  firstLearnedAt: string | null;
  /** 最近学习时间（ISO 8601） */
  lastLearnedAt: string | null;
  /** 累计学习次数 */
  learnedCount: number;
  /** 掌握评分（0–10）；已掌握的精简记录没有分数 */
  masteryScore: number | null;
  /** 复习次数 */
  reviewCount: number;
  /** 连续高分次数 */
  highScoreStreak: number;
  /** 最近复习时间（ISO 8601） */
  lastReviewedAt: string | null;
  /** 下次复习时间（ISO 8601） */
  nextReviewAt: string | null;
  /** 遗忘次数 */
  lapseCount: number;
  /** 掌握时间（ISO 8601） */
  masteredAt: string | null;
  /** 复习历史，按仓库中的顺序保留 */
  reviewHistory: ReviewEvent[];
};

/** 一次读取得到的记录集合与来源信息 */
export type EnglishRecordsSnapshot = {
  /** 快照生成时间（ISO 8601） */
  generatedAt: string;
  /** 记录仓库的绝对路径 */
  repoPath: string;
  /** 归一化后的全部记录 */
  records: EnglishRecord[];
};
