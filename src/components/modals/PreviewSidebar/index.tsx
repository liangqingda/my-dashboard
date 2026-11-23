/**
 * 媒体预览的列表侧栏：列当前目录里同一类型的条目（视频 / 图片），高亮正在看的那一条。
 *
 * 与弹窗 header 同一档软底、靠一条细线分列，和文档预览的目录列是同一套观感；
 * 列表条目几百条也整份渲染（文件页本身就是整份列表，不做假分页）。
 * 视频与图片预览共用：图标与标题由调用方传，侧栏本身不判断条目类型。
 */

import { ScrollArea, UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { PreviewSidebarProps } from './types';

import styles from './index.scss';

const PreviewSidebar = ({
  activeId,
  icon,
  items,
  onSelect,
  title,
}: PreviewSidebarProps) => (
  <aside className={styles.sidebar}>
    <div className={styles.head}>
      <span className={styles.headTitle}>{title}</span>
      <span className={styles.count}>{items.length}</span>
    </div>

    <ScrollArea
      className={styles.list}
      offsetScrollbars="y"
      scrollbarSize={6}
      scrollbars="y"
      type="auto"
    >
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
            <span aria-hidden="true" className={styles.icon}>
              {icon}
            </span>
            <FreeTruncatedText
              className={styles.name}
              ellipsis="middle"
              lines={1}
              text={item.name}
            />
          </UnstyledButton>
        );
      })}
    </ScrollArea>
  </aside>
);

export default PreviewSidebar;
