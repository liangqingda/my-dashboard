import { useEffect, useState } from 'react';
import {
  Badge,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';

import CopyIconButton from '@/components/CopyIconButton';
import FreeTable from '@/components/FreeTable';
import { getErrorMessage } from '@/utils/error';
import { formatDateTime } from '@/utils/format';

import { EMPTY_CELL, STATUS_COLORS, STATUS_LABELS } from '../constants';
import type { RecordStatus } from '../types';
import { formatScore } from '../utils/records';
import { fetchRecordDetail } from '../utils/records-api';

import type { DetailState, RecordDetailBodyProps } from './types';

import styles from './index.scss';

/** 时间缺失时显示占位；有时间就按全站格式 */
const formatDateTimeOrEmpty = (value: string | null): string =>
  value === null || value === '' ? EMPTY_CELL : formatDateTime(value);

/** 状态文案：历史记录里的旧状态也走同一套词；认不出时保留原值 */
const statusText = (status: string): string =>
  status in STATUS_LABELS
    ? STATUS_LABELS[status as RecordStatus]
    : status || EMPTY_CELL;

/** 一条「字段：值」行；值缺失时显示占位，不留空 */
const field = (label: string, value: string) => (
  <Group gap={6} key={label} wrap="nowrap">
    <Text c="dimmed" size="xs" w={72}>
      {label}
    </Text>
    <Text className={styles.value} size="xs">
      {value || EMPTY_CELL}
    </Text>
  </Group>
);

/**
 * 记录详情主体：讲解、例句、统计数据与复习历史。
 * 列表页不铺正文，这一份只在打开某一条时取。
 */
const RecordDetailBody = ({ recordId }: RecordDetailBodyProps) => {
  const [state, setState] = useState<DetailState>({
    detail: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;

    fetchRecordDetail(recordId, controller.signal)
      .then(
        (detail) => {
          if (!disposed) {
            setState({ detail, error: null, loading: false });
          }
        },
        (caught: unknown) => {
          if (disposed) {
            return;
          }

          if (caught instanceof DOMException && caught.name === 'AbortError') {
            return;
          }

          setState({
            detail: null,
            error: getErrorMessage(caught, '读取记录详情失败'),
            loading: false,
          });
        },
      )
      .catch(() => {
        /* 上面已处理状态，这里只兜住回调自身抛出的异常。 */
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [recordId]);

  const { detail, error, loading } = state;

  if (loading) {
    return (
      <Group justify="center" py="lg">
        <Loader size="sm" />
      </Group>
    );
  }

  if (error !== null) {
    return (
      <Text c="red" size="sm">
        {error}
      </Text>
    );
  }

  if (detail === null) {
    return (
      <Text c="dimmed" size="sm">
        这条记录已经不在了，可能刚被其它操作删掉。
      </Text>
    );
  }

  /** 复习历史只在有评分记录时出现；已掌握记录不保留逐次历史 */
  const hasHistory = detail.reviewHistory.length > 0;

  return (
    <ScrollArea.Autosize mah="66vh" scrollbars="y" type="auto">
      <Stack gap="md">
        <Stack gap={6}>
          <Text fw={600} size="sm">
            {detail.title}
          </Text>
          <Group gap={6}>
            <Badge size="xs" variant="light">
              {detail.categoryKey}
            </Badge>
            <Badge
              color={STATUS_COLORS[detail.status]}
              size="xs"
              variant="light"
            >
              {STATUS_LABELS[detail.status]}
            </Badge>
            <Badge size="xs" variant="outline">
              {formatScore(detail.masteryScore)} 分
            </Badge>
            <CopyIconButton label="复制记录 ID" text={detail.id} />
          </Group>
        </Stack>

        <Text className={styles.body} size="sm">
          {detail.explanation || '这条记录还没有讲解'}
        </Text>

        {detail.source ? (
          <Stack gap={2}>
            <Text c="dimmed" size="xs">
              代表例句
            </Text>
            <Text className={styles.quote} size="sm">
              {detail.source}
            </Text>
          </Stack>
        ) : null}

        {detail.example ? (
          <Stack gap={2}>
            <Text c="dimmed" size="xs">
              纠正 / 示例
            </Text>
            <Text className={styles.quote} size="sm">
              {detail.example}
            </Text>
          </Stack>
        ) : null}

        {detail.tags.length > 0 ? (
          <Group gap={4}>
            {detail.tags.map((tag) => (
              <Badge key={tag} size="xs" variant="outline">
                {tag}
              </Badge>
            ))}
          </Group>
        ) : null}

        <Stack gap={4}>
          {field('掌握分', formatScore(detail.masteryScore))}
          {field('复习次数', String(detail.reviewCount))}
          {field('学习次数', String(detail.learnedCount))}
          {field('遗忘次数', String(detail.lapseCount))}
          {field('首次学习', formatDateTimeOrEmpty(detail.firstLearnedAt))}
          {field('最近学习', formatDateTimeOrEmpty(detail.lastLearnedAt))}
          {field('掌握时间', formatDateTimeOrEmpty(detail.masteredAt))}
          {field('下次复习', formatDateTimeOrEmpty(detail.nextReviewAt))}
        </Stack>

        {hasHistory ? (
          <Stack gap={4}>
            <Text c="dimmed" size="xs">
              复习历史
            </Text>
            <FreeTable compact tabularNums>
              <FreeTable.Thead>
                <FreeTable.Tr>
                  <FreeTable.Th scope="col">时间</FreeTable.Th>
                  <FreeTable.Th scope="col">得分</FreeTable.Th>
                  <FreeTable.Th scope="col">状态变化</FreeTable.Th>
                </FreeTable.Tr>
              </FreeTable.Thead>
              <FreeTable.Tbody>
                {detail.reviewHistory.map((entry) => (
                  <FreeTable.Tr
                    key={`${entry.reviewedAt}-${entry.score}-${entry.newStatus}`}
                  >
                    <FreeTable.Td className={styles.time}>
                      {formatDateTime(entry.reviewedAt)}
                    </FreeTable.Td>
                    <FreeTable.Td>{formatScore(entry.score)}</FreeTable.Td>
                    <FreeTable.Td>
                      {`${statusText(entry.previousStatus)} → ${statusText(entry.newStatus)}`}
                    </FreeTable.Td>
                  </FreeTable.Tr>
                ))}
              </FreeTable.Tbody>
            </FreeTable>
          </Stack>
        ) : null}
      </Stack>
    </ScrollArea.Autosize>
  );
};

export default RecordDetailBody;
