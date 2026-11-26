/**
 * 选集按钮 + hover 弹层：控制栏右侧的一颗「选集」，指针停在按钮或弹层上时浮出当前目录
 * 的视频列表，离开后收起；点某一条切到那一条，当前播放的一条高亮。
 *
 * 不做常驻列表：B 站式播放器把目录收进这一层，舞台始终只留画面；列表长短由调用方给，
 * 弹层内部到顶自己滚。
 */

import { useState } from 'react';
import { Popover, UnstyledButton } from '@mantine/core';
import { IconPlaylist } from '@tabler/icons-react';

import FreeIconAction from '@/components/buttons/FreeIconAction';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { VideoEpisodeMenuProps } from './types';

import styles from './index.scss';

/** 与控制栏其它图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 弹层宽度：长文件名在条目内省略，hover 看全 */
const MENU_WIDTH = 260;

const VideoEpisodeMenu = ({
  activeId,
  items,
  onChangeOpened,
  onSelect,
}: VideoEpisodeMenuProps) => {
  /** 开合只由 hover 意图管：进入按钮 / 弹层即开，离开即收；点条目不依赖点击开合 */
  const [opened, setOpened] = useState(false);

  /** 开合同时上报上层：上层据此判断「有没有弹层开着」，点画面只收弹层、不切播放 */
  const applyOpened = (next: boolean) => {
    setOpened(next);
    onChangeOpened?.(next);
  };

  const open = () => applyOpened(true);
  const close = () => applyOpened(false);

  return (
    <Popover
      offset={4}
      onChange={applyOpened}
      opened={opened}
      position="top-end"
      shadow="md"
      width={MENU_WIDTH}
      withArrow
      withinPortal
    >
      <Popover.Target>
        <div
          className={styles.target}
          onBlur={close}
          onFocus={open}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <FreeIconAction
            label={`选集（共 ${items.length} 条）`}
            tooltip="none"
            tooltipLabel={`选集（共 ${items.length} 条）`}
          >
            <IconPlaylist size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        </div>
      </Popover.Target>
      <Popover.Dropdown
        className={styles.dropdown}
        onMouseEnter={open}
        onMouseLeave={close}
      >
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
                />
              </UnstyledButton>
            );
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};

export default VideoEpisodeMenu;
