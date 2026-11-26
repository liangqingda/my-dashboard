/**
 * 图片列表按钮 + 点击弹层：header 里的一颗「图片列表」，点一下在按钮正下方浮出当前目录的全部图片，
 * 再点按钮 / 点外部 / Esc 收起；点某一张切过去并合上弹层，正在看的一张高亮。
 *
 * 按钮与弹层都走公共的 `IconPopoverButton`：弹层开着时按钮像选集那颗一样保持主色，
 * 一眼看得出这一层是它开出来的。开合状态由弹窗持有（弹层开着时 header 要恒可见），
 * 这里只回传开合与点选；条目怎么排、怎么滚归 `PreviewItemList`（与视频选集同一份）。
 */

import { IconPhoto } from '@tabler/icons-react';

import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import PreviewItemList from '@/components/modals/PreviewItemList';

import type { ImageListMenuProps } from './types';

/** 与 header 那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 弹层宽度：长文件名在条目内省略，hover 看全 */
const MENU_WIDTH = 260;

/** 条目自带 10px 行内留白，弹层外壳只收 6px 边 */
const MENU_PADDING = 6;

const ImageListMenu = ({
  activeId,
  items,
  onChangeOpened,
  onSelect,
  opened,
  tipDark = false,
}: ImageListMenuProps) => (
  <IconPopoverButton
    active={opened}
    hint={`图片列表（共 ${items.length} 张）`}
    icon={<IconPhoto size={ICON_SIZE} stroke={ICON_STROKE} />}
    label="图片列表"
    offset={4}
    onChange={onChangeOpened}
    opened={opened}
    padding={MENU_PADDING}
    position="bottom"
    tipDark={tipDark}
    width={MENU_WIDTH}
  >
    <PreviewItemList
      activeId={activeId}
      items={items}
      onSelect={(id) => {
        onSelect(id);
        onChangeOpened(false);
      }}
      tipDark={tipDark}
    />
  </IconPopoverButton>
);

export default ImageListMenu;
