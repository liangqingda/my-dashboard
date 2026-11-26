/**
 * 媒体预览的条目列表：弹层里的那一列（视频选集、图片列表共用）。
 *
 * 只排条目：整行可点、名字中间省略、当前一条高亮；条目到顶在弹层内部自己滚，不把条目顶出弹窗。
 * 条目类型、排序、图标与「点完要不要合上弹层」都归调用方。
 */

import { UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { PreviewItemListProps } from './types';

import styles from './index.scss';

const PreviewItemList = ({
  activeId,
  items,
  onSelect,
  tipDark = false,
}: PreviewItemListProps) => (
  <div className={styles.list}>
    {items.map((item) => {
      const active = item.id === activeId;

      return (
        <UnstyledButton
          aria-current={active}
          className={cx(styles.item, active && styles.itemActive)}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <FreeTruncatedText
            className={styles.name}
            ellipsis="middle"
            lines={1}
            text={item.name}
            tipDark={tipDark}
          />
        </UnstyledButton>
      );
    })}
  </div>
);

export default PreviewItemList;
