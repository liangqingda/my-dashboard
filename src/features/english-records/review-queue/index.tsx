import { reviewLabel } from '@/features/english-records/utils';
import type { EnglishRecord } from '@/features/english-records/types';

import styles from './index.scss';

export type ReviewQueueProps = {
  /** 要展示的到期记录（已按到期时间排序） */
  records: EnglishRecord[];
  /** 到期记录总数，可能多于展示条数 */
  total: number;
  /** 点击某条记录时定位它 */
  onSelect: (id: string) => void;
};

const ReviewQueue = ({ records, total, onSelect }: ReviewQueueProps) => (
  <section aria-label="今日复习" className={styles.queue}>
    <header className={styles.header}>
      <h3 className={styles.title}>
        今日复习 <span className={styles.count}>{total}</span>
      </h3>
      <p className={styles.hint}>
        从最久没碰的那条开始，点一条就到下面去展开它。
      </p>
    </header>
    <div className={styles.strip}>
      {records.map((record) => (
        <button
          className={styles.chip}
          key={record.id}
          onClick={() => onSelect(record.id)}
          type="button"
        >
          <span className={styles.chipTitle}>{record.title}</span>
          <span className={styles.chipMeta}>{reviewLabel(record)}</span>
        </button>
      ))}
      {total > records.length ? (
        <span className={styles.more}>
          还有 {total - records.length} 条
        </span>
      ) : null}
    </div>
  </section>
);

export default ReviewQueue;
