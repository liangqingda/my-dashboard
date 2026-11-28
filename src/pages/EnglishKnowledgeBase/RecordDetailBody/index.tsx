import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Box, Group, Loader, Stack, Text } from '@mantine/core';

import CopyIconButton from '@/components/buttons/CopyIconButton';
import FreeTable from '@/components/tables/FreeTable';
import { getErrorMessage } from '@/utils/error';
import { formatDateTime } from '@/utils/format';

import { EMPTY_CELL, STATUS_COLORS, STATUS_LABELS } from '../constants';
import type { RecordStatus } from '../types';
import { formatScore, formatTenStreak } from '../utils/records';
import { fetchRecordDetail } from '../utils/records-api';

import type { DetailState, RecordDetailBodyProps } from './types';

import styles from './index.scss';

/** 时间缺失时显示占位；有时间就按全站格式 */
const formatDateTimeOrEmpty = (value: string | null): string =>
  value === null || value === '' ? EMPTY_CELL : formatDateTime(value);

/** 状态文案：未知状态原样显示，不静默隐藏 */
const statusText = (status: string): string =>
  status in STATUS_LABELS
    ? STATUS_LABELS[status as RecordStatus]
    : status || EMPTY_CELL;

/**
 * 记录信息表格的一行：字段名 + 值；值缺失时显示占位，不留空。
 * `action` 是值后面紧跟的一个操作（目前只有记录 ID 后面的复制按钮）。
 */
const fieldRow = (label: string, value: string, action?: ReactNode) => (
  <FreeTable.Tr key={label}>
    <FreeTable.Td className={styles.fieldLabel}>{label}</FreeTable.Td>
    <FreeTable.Td>
      <Group gap={6} wrap="nowrap">
        <Text className={styles.value} size="xs">
          {value || EMPTY_CELL}
        </Text>
        {action}
      </Group>
    </FreeTable.Td>
  </FreeTable.Tr>
);

/**
 * 记录详情主体：讲解、例句、统计数据与复习历史。
 * 列表页不铺正文，这一份只在打开某一条时取。
 */
const RecordDetailBody = ({ recordId, onReady }: RecordDetailBodyProps) => {
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

  /** 取数结束（成功 / 失败 / 空态都算就位）：父级据此解除开窗动画等待 */
  useEffect(() => {
    if (!loading) {
      onReady?.();
    }
  }, [loading, onReady]);

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

      <Group align="flex-start" gap={24} wrap="wrap">
        <Stack gap={4}>
          <Text c="dimmed" size="xs">
            记录信息
          </Text>
          <Box className={styles.tableWrap}>
            <FreeTable className={styles.table} compact tabularNums>
              <FreeTable.Thead>
                <FreeTable.Tr>
                  <FreeTable.Th scope="col">字段</FreeTable.Th>
                  <FreeTable.Th scope="col">值</FreeTable.Th>
                </FreeTable.Tr>
              </FreeTable.Thead>
              <FreeTable.Tbody>
                {fieldRow(
                  '记录 ID',
                  detail.id,
                  <CopyIconButton
                    iconSize={13}
                    label="复制记录 ID（C）"
                    size="xs"
                    text={detail.id}
                  />,
                )}
                {fieldRow('掌握分', formatScore(detail.masteryScore))}
                {fieldRow('连续满分', formatTenStreak(detail.masteredTenStreak))}
                {fieldRow('复习次数', String(detail.reviewCount))}
                {fieldRow('学习次数', String(detail.learnedCount))}
                {fieldRow('遗忘次数', String(detail.lapseCount))}
                {fieldRow('首次学习', formatDateTimeOrEmpty(detail.firstLearnedAt))}
                {fieldRow('最近学习', formatDateTimeOrEmpty(detail.lastLearnedAt))}
                {fieldRow('掌握时间', formatDateTimeOrEmpty(detail.masteredAt))}
                {fieldRow('下次复习', formatDateTimeOrEmpty(detail.nextReviewAt))}
              </FreeTable.Tbody>
            </FreeTable>
          </Box>
        </Stack>

        {hasHistory ? (
          <Stack gap={4}>
            <Text c="dimmed" size="xs">
              复习历史
            </Text>
            <Box className={styles.tableWrap}>
              <FreeTable className={styles.table} compact tabularNums>
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
            </Box>
          </Stack>
        ) : null}
      </Group>
    </Stack>
  );
};

export default RecordDetailBody;
