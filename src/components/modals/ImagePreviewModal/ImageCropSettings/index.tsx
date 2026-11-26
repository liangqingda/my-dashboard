/**
 * 裁剪设置：header 上的一颗设置图标，点开只有一件事——裁剪后是覆盖源文件还是另存到新目录。
 *
 * 选择存进页面命名空间（`<标识>:image-preview`）的 `cropSaveMode`，下次打开沿用它；
 * 两种落点的具体规则写在 `docs/local-repo-data.md` 与弹窗 README 里，面板不再重复解释。
 */

import { SegmentedControl } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';

import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import FreePanelField from '@/components/panels/FreePanelField';
import FreePanelGroup from '@/components/panels/FreePanelGroup';

import type { ImageCropMode } from '../types';

/** 与 header 那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 两档保存方式：标签本身就说清落点，面板里不再铺说明文字 */
const MODE_OPTIONS = [
  { label: '替换源文件', value: 'replace' },
  { label: '另存新目录', value: 'copy' },
];

/** 裁剪设置的入参 */
export type ImageCropSettingsProps = {
  /** 当前保存方式 */
  mode: ImageCropMode;
  /** 改保存方式（立即持久化） */
  onChangeMode: (mode: ImageCropMode) => void;
  /** 弹层是否打开（由弹窗持有：开着时 header 恒可见） */
  opened: boolean;
  /** 开合变化 */
  onChangeOpened: (opened: boolean) => void;
  /** 压在媒体画面上，提示固定深底浅字 */
  tipDark?: boolean;
};

const ImageCropSettings = ({
  mode,
  onChangeMode,
  onChangeOpened,
  opened,
  tipDark = false,
}: ImageCropSettingsProps) => (
  <IconPopoverButton
    active={opened}
    hint="裁剪设置"
    icon={<IconSettings size={ICON_SIZE} stroke={ICON_STROKE} />}
    label="裁剪设置"
    offset={4}
    onChange={onChangeOpened}
    opened={opened}
    padding={8}
    position="bottom"
    tipDark={tipDark}
    width={232}
  >
    <FreePanelGroup title="裁剪后">
      <FreePanelField label="保存方式" wide>
        <SegmentedControl
          data={MODE_OPTIONS}
          fullWidth
          onChange={(value) => {
            onChangeMode(value === 'copy' ? 'copy' : 'replace');
          }}
          size="xs"
          value={mode}
        />
      </FreePanelField>
    </FreePanelGroup>
  </IconPopoverButton>
);

export default ImageCropSettings;
