/**
 * 选集按钮 + 点击弹层：控制栏右侧的一颗「选集」，点一下浮出当前目录的视频列表，
 * 再点按钮 / 点外部 / Esc 收起；点某一条切到那一条并合上弹层，当前播放的一条高亮。
 *
 * 不做常驻列表：B 站式播放器把目录收进这一层，舞台始终只留画面；列表长短由调用方给，
 * 弹层内部到顶自己滚。
 */

import { useState } from 'react';
import { Popover, Tooltip, UnstyledButton } from '@mantine/core';
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
  tipDark = false,
}: VideoEpisodeMenuProps) => {
  /** 开合由按钮点击切换；点外部 / Esc 由 Popover 收回并回写这里 */
  const [opened, setOpened] = useState(false);

  /** 开合同时上报上层：上层据此判断「有没有弹层开着」，点画面只收弹层、不切播放 */
  const applyOpened = (next: boolean) => {
    setOpened(next);
    onChangeOpened?.(next);
  };

  const close = () => applyOpened(false);
  const toggle = () => applyOpened(!opened);

  return (
    <Popover
      offset={4}
      onChange={applyOpened}
      opened={opened}
      /* 正上方居中：按钮落在弹层底边中点，而不是贴着弹层右角 */
      position="top"
      shadow="md"
      width={MENU_WIDTH}
      withArrow
      withinPortal
    >
      <Popover.Target>
        <Tooltip
          classNames={{ tooltip: cx(tipDark && styles.tipDark) }}
          label={`选集（共 ${items.length} 条）`}
          withArrow
        >
          <FreeIconAction
            label={`选集（共 ${items.length} 条）`}
            onClick={toggle}
            tooltip="none"
          >
            <IconPlaylist size={ICON_SIZE} stroke={ICON_STROKE} />
          </FreeIconAction>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown className={styles.dropdown}>
        <div className={styles.list}>
          {items.map((item) => {
            const active = item.id === activeId;

            return (
              <UnstyledButton
                aria-current={active}
                className={cx(styles.item, active && styles.itemActive)}
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  close();
                }}
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
      </Popover.Dropdown>
    </Popover>
  );
};

export default VideoEpisodeMenu;
