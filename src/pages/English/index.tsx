import { useMemo, useState } from 'react';
import { Button, Skeleton, Stack } from '@mantine/core';

import { useEnglishRecords } from '@/features/english-records/hooks/useEnglishRecords';
import RecordsLibrary from '@/features/english-records/records-library';
import RecordsSummary from '@/features/english-records/records-summary';
import ReviewQueue from '@/features/english-records/review-queue';
import {
  collectDueRecords,
  formatMoment,
} from '@/features/english-records/utils';

import styles from './index.scss';

/** 复习条带最多展示的条数 */
const QUEUE_SIZE = 8;

/** 英语页：展示 learn-english 仓库里的全部学习记录。 */
const English = () => {
  const { records, generatedAt, repoPath, loading, error, refresh } =
    useEnglishRecords();
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const due = useMemo(() => collectDueRecords(records), [records]);

  const handleSelect = (id: string) => setFocus({ id, nonce: Date.now() });

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <p className={styles.errorTitle}>{error}</p>
          <p className={styles.errorHint}>
            开发模式下页面直接读取同级目录的 learn-english 仓库；如果仓库不在
            `../learn-english`，可以用环境变量 ENGLISH_RECORDS_DIR 指定实际路径。
          </p>
          <Button onClick={refresh} size="xs" variant="light">
            重新读取
          </Button>
        </div>
      </div>
    );
  }

  if (loading && records.length === 0) {
    return (
      <div className={styles.page}>
        <Stack gap="sm">
          <Skeleton h={28} w="22%" />
          <Skeleton h={16} w="46%" />
          <Skeleton h={220} />
          <Skeleton h={140} />
        </Stack>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <RecordsSummary loading={loading} onRefresh={refresh} records={records} />
      {due.length > 0 ? (
        <ReviewQueue
          onSelect={handleSelect}
          records={due.slice(0, QUEUE_SIZE)}
          total={due.length}
        />
      ) : null}
      <RecordsLibrary
        focus={focus}
        key={focus?.nonce ?? 0}
        records={records}
      />
      <footer className={styles.footer}>
        <span className={styles.source}>读取自 {repoPath || '../learn-english'}</span>
        {generatedAt ? (
          <span>更新于 {formatMoment(generatedAt)}</span>
        ) : null}
      </footer>
    </div>
  );
};

export default English;
