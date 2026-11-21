import { memo } from 'react';
import { ActionIcon, Badge, Group, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

import CopyIconButton from '@/components/buttons/CopyIconButton';
import FreeTable from '@/components/tables/FreeTable';
import TruncatedText from '@/components/texts/TruncatedText';
import { formatDateTime } from '@/utils/format';

import { EMPTY_CELL, STATUS_COLORS, STATUS_LABELS } from '../constants';
import { categoryLabel, formatTenStreak } from '../utils/records';

import type { RecordsTableProps } from './types';

import styles from './index.scss';

/**
 * 记录表格：一行一条记录。整行是打开入口（键盘走标题那个按钮），
 * 操作列两个图标：复制记录 ID（复制给 learn-english 命令用）与删除，
 * 两个按钮自己吞掉点击，不会顺带打开详情。
 * 表格外观（边框、表头吸顶、行 hover）由 `FreeTable` 统一给，这里只管列宽与内容。
 */
const RecordsTable = memo(
  ({ records, categoryLabels, onOpen, onDelete }: RecordsTableProps) => (
    <FreeTable tabularNums>
      <FreeTable.Thead>
        <FreeTable.Tr>
          <FreeTable.Th scope="col">知识点</FreeTable.Th>
          <FreeTable.Th className={styles.categoryWidth} scope="col">
            分类
          </FreeTable.Th>
          <FreeTable.Th className={styles.statusWidth} scope="col">
            状态
          </FreeTable.Th>
          <FreeTable.Th className={styles.streakWidth} scope="col">
            连续满分
          </FreeTable.Th>
          <FreeTable.Th className={styles.timeWidth} scope="col">
            最近更新
          </FreeTable.Th>
          <FreeTable.Th className={styles.actionWidth} scope="col">
            操作
          </FreeTable.Th>
        </FreeTable.Tr>
      </FreeTable.Thead>
      <FreeTable.Tbody>
        {records.map((record) => (
          <FreeTable.Tr
            className={styles.row}
            key={record.id}
            onClick={() => onOpen(record)}
          >
            <FreeTable.Td>
              <TruncatedText
                className={styles.title}
                onClick={() => onOpen(record)}
                text={record.title}
              />
            </FreeTable.Td>
            <FreeTable.Td>
              <Badge size="xs" variant="light">
                {categoryLabel(categoryLabels, record.categoryKey)}
              </Badge>
            </FreeTable.Td>
            <FreeTable.Td>
              <Badge
                color={STATUS_COLORS[record.status]}
                size="xs"
                variant="light"
              >
                {STATUS_LABELS[record.status]}
              </Badge>
            </FreeTable.Td>
            <FreeTable.Td className={styles.streak}>
              {formatTenStreak(record.masteredTenStreak)}
            </FreeTable.Td>
            <FreeTable.Td className={styles.time}>
              {record.updatedAt ? formatDateTime(record.updatedAt) : EMPTY_CELL}
            </FreeTable.Td>
            <FreeTable.Td className={styles.actionWidth}>
              <Group gap={2} justify="center" wrap="nowrap">
                <CopyIconButton label="复制记录 ID" text={record.id} />
                <Tooltip label="删除这条记录" withArrow>
                  <ActionIcon
                    aria-label={`删除「${record.title}」`}
                    color="red"
                    onClick={(event) => {
                      // 整行是打开入口：点删除只删，不打开详情
                      event.stopPropagation();
                      onDelete(record);
                    }}
                    size="sm"
                    variant="subtle"
                  >
                    <IconTrash size={15} stroke={1.9} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </FreeTable.Td>
          </FreeTable.Tr>
        ))}
      </FreeTable.Tbody>
    </FreeTable>
  ),
);

export default RecordsTable;
