/**
 * 视频列表侧栏：列当前目录里的视频，高亮正在播放的那一条。
 *
 * 与弹窗 header 同一档软底、靠一条细线分列，和文档预览的目录列是同一套观感；
 * 列表条目几百条也整份渲染（文件页本身就是整份列表，不做假分页）。
 */

import { ScrollArea, UnstyledButton } from '@mantine/core';
import { IconVideo } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { VideoSidebarProps } from './types';

import styles from './index.scss';

/** 侧栏图标与弹窗 header 同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.6;

const VideoSidebar = ({ activeId, items, onSelect }: VideoSidebarProps) => (
  <aside className={styles.sidebar}>
    <div className={styles.head}>
      <span className={styles.headTitle}>当前目录视频</span>
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
            <IconVideo
              aria-hidden="true"
              className={styles.icon}
              size={ICON_SIZE}
              stroke={ICON_STROKE}
            />
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

export default VideoSidebar;
