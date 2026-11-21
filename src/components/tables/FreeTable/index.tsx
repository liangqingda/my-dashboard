/**
 * 基础表格（前端 UI 基建）：Mantine `Table` 加项目统一外观。
 *
 * 底边框、表头排版与吸顶、行 hover 只在这里定义一次；业务表格（`NotesTable`、编辑器网格）
 * 只补列宽、行交互与单元格内容样式，不再各自写 `<table>` 和那套 SCSS。
 * 分段组件（`Thead` / `Tbody` / `Tr` / `Th` / `Td`）也从这里取，避免业务侧再 import 一份
 * Mantine 的 `Table`、进而出现两套外观。
 */

import { Table } from '@mantine/core';

import { cx } from '@/utils/cx';

import type { FreeTableProps } from './types';

import styles from './index.scss';

/** 表格本体：`compact` 收紧内边距，其余外观由样式统一给 */
const FreeTableBase = ({
  className,
  compact = false,
  stickyHeader = true,
  tabularNums = false,
  ...rest
}: FreeTableProps) => (
  <Table
    className={cx(styles.table, compact && styles.compact, className)}
    highlightOnHover
    highlightOnHoverColor="var(--app-surface-hover)"
    stickyHeader={stickyHeader}
    tabularNums={tabularNums}
    withRowBorders={false}
    {...rest}
  />
);

/** 挂上 Mantine 的分段组件，业务侧统一从 `FreeTable` 取用 */
const FreeTable = Object.assign(FreeTableBase, {
  Caption: Table.Caption,
  Tbody: Table.Tbody,
  Td: Table.Td,
  Th: Table.Th,
  Thead: Table.Thead,
  Tfoot: Table.Tfoot,
  Tr: Table.Tr,
});

export default FreeTable;
