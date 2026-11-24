/**
 * 弹层面板里的一组设置：浅底色把同类设置圈在一起，不描边。
 *
 * 只排「组」这一层——组标题与内容区的位置、底色、内边距、组内间距都定在这里，
 * 组内放哪些字段、怎么分组归调用方（分组口径见 `docs/ui-components.md`）。
 */

import type { ReactNode } from 'react';
import { Text } from '@mantine/core';

import styles from './index.scss';

/** 组内内容的排法：字段横排可换行，或竖向排（快捷键这类清单） */
export type FreePanelGroupLayout = 'fields' | 'stack';

/** 面板分组的入参 */
export type FreePanelGroupProps = {
  /** 组标题：一句话说明这一组在调什么 */
  title: string;
  /** 组内排法，默认 `fields` */
  layout?: FreePanelGroupLayout;
  /** 组内容 */
  children: ReactNode;
};

const FreePanelGroup = ({
  children,
  layout = 'fields',
  title,
}: FreePanelGroupProps) => (
  <section className={styles.group}>
    <Text className={styles.groupTitle}>{title}</Text>
    <div className={styles[layout]}>{children}</div>
  </section>
);

export default FreePanelGroup;
