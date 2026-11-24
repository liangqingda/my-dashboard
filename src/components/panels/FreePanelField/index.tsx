/**
 * 弹层面板里的一个字段：标题在上、控件在下；需要当前值时标题行右侧补一个数。
 *
 * 只管「字段」这一层外观——标题字号与颜色、上下间距、横向排布的 flex 基准与整行占位。
 * 控件本身（分段控件 / 输入 / 路径行）由调用方给。
 */

import type { ReactNode } from 'react';
import { Text } from '@mantine/core';

import styles from './index.scss';

/** 面板字段的入参 */
export type FreePanelFieldProps = {
  /** 字段标题 */
  label: string;
  /** 标题行右侧的当前值（如滑块百分比），不传则不显示 */
  value?: string;
  /** 是否占满整行（滑块、路径行这类需要长边） */
  wide?: boolean;
  /** 控件 */
  children: ReactNode;
};

const FreePanelField = ({
  children,
  label,
  value,
  wide = false,
}: FreePanelFieldProps) => (
  <div className={wide ? styles.fieldWide : styles.field}>
    {value === undefined ? (
      <Text className={styles.label}>{label}</Text>
    ) : (
      <div className={styles.labelRow}>
        <Text className={styles.label}>{label}</Text>
        <Text className={styles.labelValue}>{value}</Text>
      </div>
    )}
    {children}
  </div>
);

export default FreePanelField;
