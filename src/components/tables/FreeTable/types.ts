/**
 * 基础表格的入参：透传 Mantine `Table` 的 props，另加项目自己的档位。
 */

import type { TableProps } from '@mantine/core';

/** 基础表格的入参 */
export type FreeTableProps = TableProps & {
  /** 密排档：编辑器这类网格用，只收紧单元格内边距 */
  compact?: boolean;
};
