/**
 * 列表分组标题：网格分组段与表格分组行共用同一套标题外观（对齐 macOS 访达的分组段）。
 * 只排标题文字；段 / 行的容器、间距与底色由调用方各自给。
 */

import type { EntryGroupHeaderProps } from './types';

import styles from './index.scss';

const EntryGroupHeader = ({ label }: EntryGroupHeaderProps) => (
  <div className={styles.header}>{label}</div>
);

export default EntryGroupHeader;
