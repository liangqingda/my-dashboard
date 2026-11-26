/**
 * 媒体预览条目列表的契约：弹层里那一列条目，条目与高亮由调用方给，点选只回传 id。
 */

/** 预览列表里的一条：`id` 是条目自身的标识（文件页用文件路径） */
export type PreviewItem = {
  /** 条目唯一标识 */
  id: string;
  /** 展示名（文件名） */
  name: string;
};

/** 条目列表的入参 */
export type PreviewItemListProps = {
  /** 当前目录里的同一类条目（顺序即翻篇顺序） */
  items: readonly PreviewItem[];
  /** 当前预览中的条目 id，用来高亮 */
  activeId: string;
  /** 点选某一条（只回传 id；开合归调用方的弹层壳） */
  onSelect: (id: string) => void;
  /** 名字省略后的提示固定深底浅字、不随主题反转 */
  tipDark?: boolean;
};
