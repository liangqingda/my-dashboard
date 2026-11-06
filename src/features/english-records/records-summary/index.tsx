import { useMemo } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import type { EnglishRecord } from '@/features/english-records/types';
import { isReviewDue } from '@/features/english-records/utils';

import styles from './index.scss';

export type RecordsSummaryProps = {
  /** 全部记录 */
  records: EnglishRecord[];
  /** 是否正在重新读取 */
  loading: boolean;
  /** 重新读取仓库 */
  onRefresh: () => void;
};

/** 页头：一句话交代记录规模与今天的复习压力。 */
const RecordsSummary = ({
  records,
  loading,
  onRefresh,
}: RecordsSummaryProps) => {
  const stats = useMemo(() => {
    const result = { total: 0, mastered: 0, due: 0 };

    for (const record of records) {
      result.total += 1;

      if (record.status === 'mastered') {
        result.mastered += 1;
      }

      if (isReviewDue(record)) {
        result.due += 1;
      }
    }

    return result;
  }, [records]);

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h2 className={styles.title}>英语</h2>
        <p className={styles.line}>
          learn-english 里共 <strong>{stats.total}</strong> 条记录，
          {stats.due > 0 ? (
            <>
              其中 <strong className={styles.due}>{stats.due}</strong> 条今天到期
            </>
          ) : (
            '今天没有到期的记录'
          )}
          ，已掌握 <strong>{stats.mastered}</strong> 条。
        </p>
      </div>
      <Tooltip label="重新读取仓库" withArrow>
        <ActionIcon
          aria-label="重新读取仓库"
          className={styles.refresh}
          loading={loading}
          onClick={onRefresh}
          size="md"
          variant="subtle"
        >
          <IconRefresh size={16} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
    </header>
  );
};

export default RecordsSummary;
