/**
 * 选集按钮 + 点击弹层：控制栏右侧的一颗「选集」，点一下浮出当前目录的视频列表，
 * 再点按钮 / 点外部 / Esc 收起；点某一条切到那一条并合上弹层，当前播放的一条高亮。
 *
 * 按钮与弹层都走公共的 `IconPopoverButton`：弹层开着时按钮像设置那颗一样保持主色（`active`），
 * 一眼看得出这一层是它开出来的；弹层开在按钮正上方（控制栏贴着画面下沿，向下会顶出屏幕）。
 *
 * 不做常驻列表：B 站式播放器把目录收进这一层，舞台始终只留画面；列表长短由调用方给，
 * 弹层内部到顶自己滚。
 */

import { useState } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconPlaylist } from '@tabler/icons-react';

import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import type { VideoEpisodeMenuProps } from './types';

import styles from './index.scss';

/** 与控制栏其它图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 弹层宽度：长文件名在条目内省略，hover 看全 */
const MENU_WIDTH = 260;

/** 条目自带 10px 行内留白，弹层外壳只收 6px 边 */
const MENU_PADDING = 6;

const VideoEpisodeMenu = ({
  activeId,
  items,
  onChangeOpened,
  onSelect,
  tipDark = false,
}: VideoEpisodeMenuProps) => {
  /** 开合由按钮点击切换；点外部 / Esc 由弹层壳收回并回写这里 */
  const [opened, setOpened] = useState(false);

  /** 开合同时上报上层：上层据此判断「有没有弹层开着」，点画面只收弹层、不切播放 */
  const applyOpened = (next: boolean) => {
    setOpened(next);
    onChangeOpened?.(next);
  };

  return (
    <IconPopoverButton
      active={opened}
      hint={`选集（共 ${items.length} 条）`}
      icon={<IconPlaylist size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="选集"
      offset={4}
      onChange={applyOpened}
      opened={opened}
      padding={MENU_PADDING}
      /* 正上方居中：按钮落在弹层底边中点，而不是贴着弹层右角 */
      position="top"
      tipDark={tipDark}
      width={MENU_WIDTH}
    >
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
                applyOpened(false);
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
    </IconPopoverButton>
  );
};

export default VideoEpisodeMenu;
