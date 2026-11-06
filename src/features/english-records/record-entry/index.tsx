import { Collapse } from '@mantine/core';

import { STATUS_META } from '@/features/english-records/constants';
import type { EnglishRecord } from '@/features/english-records/types';
import {
  cx,
  formatDay,
  formatMoment,
  isReviewDue,
  reviewLabel,
} from '@/features/english-records/utils';

import styles from './index.scss';

export type RecordEntryProps = {
  /** 要展示的记录 */
  record: EnglishRecord;
  /** 是否展开详情 */
  expanded: boolean;
  /** 是否由复习清单跳转高亮 */
  highlighted: boolean;
  /** 展开 / 收起 */
  onToggle: () => void;
};

/** 一条记录在展开后展示的时间与次数事实。 */
const buildFacts = (record: EnglishRecord) =>
  [
    { label: '首次学习', value: formatMoment(record.firstLearnedAt) },
    { label: '最近学习', value: formatMoment(record.lastLearnedAt) },
    { label: '最近复习', value: formatMoment(record.lastReviewedAt) },
    { label: '下次复习', value: formatDay(record.nextReviewAt) },
    { label: '掌握时间', value: formatMoment(record.masteredAt) },
    {
      label: '次数',
      value:
        record.learnedCount > 1 || record.reviewCount > 0
          ? `学习 ${record.learnedCount} 次，复习 ${record.reviewCount} 次`
          : '',
    },
    { label: '遗忘', value: record.lapseCount > 0 ? `${record.lapseCount} 次` : '' },
  ].filter((fact) => fact.value !== '');

const RecordEntry = ({
  record,
  expanded,
  highlighted,
  onToggle,
}: RecordEntryProps) => {
  const status = STATUS_META[record.status];
  const due = isReviewDue(record);
  const panelId = `record-panel-${record.id}`;
  const facts = buildFacts(record);

  return (
    <article
      className={cx(
        styles.entry,
        expanded ? styles.entryOpen : undefined,
        highlighted ? styles.entryHighlight : undefined,
      )}
      id={`record-${record.id}`}
    >
      <button
        aria-controls={panelId}
        aria-expanded={expanded}
        className={styles.trigger}
        onClick={onToggle}
        type="button"
      >
        <span className={styles.gutter} data-status={record.status}>
          <span className={styles.level}>
            {[1, 2, 3].map((step) => (
              <span
                className={cx(
                  styles.bar,
                  step <= status.level ? styles.barOn : undefined,
                )}
                key={step}
              />
            ))}
          </span>
          <span className={styles.gutterStatus}>{status.label}</span>
          <span className={styles.gutterScore}>
            {record.masteryScore === null ? '—' : Math.round(record.masteryScore)}
          </span>
        </span>
        <span className={styles.content}>
          <span className={styles.title}>{record.title}</span>
          {record.explanation ? (
            <span className={styles.explanation}>{record.explanation}</span>
          ) : null}
          <span className={styles.meta}>
            <span className={styles.review} data-due={due ? 'true' : undefined}>
              {reviewLabel(record)}
            </span>
            {record.tags.length > 0 ? (
              <span className={styles.tags}>
                {record.tags.slice(0, 3).map((tag) => (
                  <span className={styles.tag} key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </span>
      </button>
      <Collapse expanded={expanded} transitionDuration={160}>
        <div className={styles.panel} id={panelId}>
          {record.source ? (
            <p className={styles.source}>{record.source}</p>
          ) : null}
          {record.example ? (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>例句</span>
              <p className={styles.example}>{record.example}</p>
            </div>
          ) : null}
          {facts.length > 0 ? (
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div className={styles.fact} key={fact.label}>
                  <dt className={styles.factLabel}>{fact.label}</dt>
                  <dd className={styles.factValue}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {record.reviewHistory.length > 0 ? (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>复习历史</span>
              <ol className={styles.history}>
                {record.reviewHistory.map((event) => (
                  <li
                    className={styles.historyRow}
                    key={`${event.reviewedAt}-${event.newStatus}-${event.score}`}
                  >
                    <span className={styles.historyDate}>
                      {formatMoment(event.reviewedAt)}
                    </span>
                    <span className={styles.historyScore}>
                      {Math.round(event.score)} 分
                    </span>
                    <span className={styles.historyMove}>
                      {STATUS_META[event.previousStatus].label} →{' '}
                      {STATUS_META[event.newStatus].label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {record.tags.length > 0 ? (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>标签</span>
              <span className={styles.tags}>
                {record.tags.map((tag) => (
                  <span className={styles.tag} key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            </div>
          ) : null}
          <span className={styles.recordId}>{record.id}</span>
        </div>
      </Collapse>
    </article>
  );
};

export default RecordEntry;
