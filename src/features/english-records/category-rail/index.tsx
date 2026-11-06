import { cx } from '@/features/english-records/utils';

import styles from './index.scss';

export type CategoryRailItem = {
  /** 分类标识；'all' 之外的取值即仓库分类名 */
  key: string;
  /** 展示名称 */
  label: string;
  /** 记录条数 */
  count: number;
};

export type CategoryRailProps = {
  /** 分类列表（不含「全部」） */
  items: CategoryRailItem[];
  /** 全部记录条数 */
  total: number;
  /** 当前选中的分类，'all' 表示全部 */
  value: string;
  /** 切换分类 */
  onChange: (value: string) => void;
};

const CategoryRail = ({ items, total, value, onChange }: CategoryRailProps) => (
  <nav aria-label="记录分类" className={styles.rail}>
    <button
      aria-pressed={value === 'all'}
      className={cx(styles.item, value === 'all' ? styles.itemActive : undefined)}
      onClick={() => onChange('all')}
      type="button"
    >
      <span className={styles.label}>全部</span>
      <span className={styles.count}>{total}</span>
    </button>
    {items.map((item) => (
      <button
        aria-pressed={value === item.key}
        className={cx(
          styles.item,
          value === item.key ? styles.itemActive : undefined,
          item.count === 0 ? styles.itemEmpty : undefined,
        )}
        disabled={item.count === 0}
        key={item.key}
        onClick={() => onChange(item.key)}
        type="button"
      >
        <span className={styles.label}>{item.label}</span>
        <span className={styles.count}>{item.count}</span>
      </button>
    ))}
  </nav>
);

export default CategoryRail;
