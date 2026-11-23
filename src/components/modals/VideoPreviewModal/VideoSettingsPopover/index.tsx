/**
 * 视频设置面板：一个图标按钮 + 就近弹出的一档设置。
 *
 * 可改的只有三件：← / → 是快进后退还是翻篇、快进后退的步长、截图存到哪；
 * 其余键位固定，这里整份列出来当作速查表（改键位属于另一件事，不由这个面板承担）。
 * 打开期间弹窗会把整组快捷键收掉（见弹窗的 `shortcutsEnabled`），
 * 免得在输入框 / 分段控件里调值时顺手翻篇或快进。
 */

import { useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Kbd,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSettings } from '@tabler/icons-react';

import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { getErrorMessage } from '@/utils/error';

import {
  MAX_SEEK_STEP,
  MIN_SEEK_STEP,
  SETTINGS_PANEL_WIDTH,
  type VideoArrowMode,
} from '../constants';

import type { VideoSettingsPopoverProps } from './types';

import styles from './index.scss';

/** 与弹窗 header 那排图标同一档 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.8;

/** 方向键去向的两档 */
const ARROW_MODE_OPTIONS: { label: string; value: VideoArrowMode }[] = [
  { label: '快进 / 后退', value: 'seek' },
  { label: '切换上下条', value: 'nav' },
];

const VideoSettingsPopover = ({
  arrowMode,
  captureDir,
  onArrowModeChange,
  onCaptureDirChange,
  onChangeOpened,
  onPickCaptureDir,
  onSeekStepChange,
  opened,
  seekStep,
}: VideoSettingsPopoverProps) => {
  /** 目录选择框打开中：按钮转圈并禁用，避免连点弹出两个系统框 */
  const [picking, setPicking] = useState(false);

  /** 全部键位速查：方向键那一行随设置变，其余固定 */
  const shortcutRows: readonly { action: string; keys: readonly string[] }[] =
    arrowMode === 'seek'
      ? [
          { action: '播放 / 暂停', keys: ['空格'] },
          { action: '上一个 / 下一个', keys: ['[', ']'] },
          { action: '快进 / 后退', keys: ['←', '→'] },
          { action: '静音 / 取消静音', keys: ['M'] },
          { action: '显示 / 隐藏视频列表', keys: ['S'] },
          { action: '全屏 / 退出全屏', keys: ['F'] },
          { action: '退出全屏 / 关闭弹窗', keys: ['Esc'] },
          { action: '删除当前视频', keys: ['Delete'] },
        ]
      : [
          { action: '播放 / 暂停', keys: ['空格'] },
          { action: '上一个 / 下一个', keys: ['[', ']', '←', '→'] },
          { action: '静音 / 取消静音', keys: ['M'] },
          { action: '显示 / 隐藏视频列表', keys: ['S'] },
          { action: '全屏 / 退出全屏', keys: ['F'] },
          { action: '退出全屏 / 关闭弹窗', keys: ['Esc'] },
          { action: '删除当前视频', keys: ['Delete'] },
        ];

  /** 步长输入：清空 / 非数字时保持原值，避免输入过程中被夹成下限 */
  const handleSeekStepChange = (value: number | string) => {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

    if (Number.isFinite(parsed)) {
      onSeekStepChange(parsed);
    }
  };

  /** 选目录：用户取消就什么都不改；失败给一条通知，别静默关掉选择框 */
  const handlePickCaptureDir = async () => {
    if (onPickCaptureDir === undefined) {
      return;
    }

    setPicking(true);

    try {
      const dir = await onPickCaptureDir();

      if (dir !== null) {
        onCaptureDirChange(dir);
      }
    } catch (error) {
      notifications.show({
        autoClose: false,
        color: 'red',
        message: getErrorMessage(error, '选择目录失败，请稍后重试'),
        title: '选择目录失败',
      });
    } finally {
      setPicking(false);
    }
  };

  return (
    <IconPopoverButton
      active={opened}
      icon={<IconSettings size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="视频设置"
      onChange={onChangeOpened}
      opened={opened}
      width={SETTINGS_PANEL_WIDTH}
    >
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={600} size="xs">
            快进 / 后退步长
          </Text>
          <NumberInput
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="blur"
            max={MAX_SEEK_STEP}
            min={MIN_SEEK_STEP}
            onChange={handleSeekStepChange}
            size="xs"
            step={1}
            suffix=" 秒"
            value={seekStep}
            w={120}
          />
        </Stack>

        <Stack gap={4}>
          <Text fw={600} size="xs">
            方向键
          </Text>
          <SegmentedControl
            data={ARROW_MODE_OPTIONS}
            fullWidth
            onChange={(value) => {
              const next = ARROW_MODE_OPTIONS.find(
                (option) => option.value === value,
              );

              if (next !== undefined) {
                onArrowModeChange(next.value);
              }
            }}
            size="xs"
            value={arrowMode}
          />
        </Stack>

        <Stack gap={4}>
          <Text fw={600} size="xs">
            截图存放位置
          </Text>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <FreeTruncatedText
              className={styles.capturePath}
              inline
              text={captureDir || '桌面（默认）'}
            />
            {onPickCaptureDir ? (
              <Button
                disabled={picking}
                loading={picking}
                onClick={() => void handlePickCaptureDir()}
                size="compact-xs"
                variant="default"
              >
                选择目录
              </Button>
            ) : null}
          </Group>
          {captureDir ? (
            <Button
              onClick={() => onCaptureDirChange('')}
              size="compact-xs"
              variant="subtle"
              w="fit-content"
            >
              恢复默认（桌面）
            </Button>
          ) : null}
        </Stack>

        <Divider />

        <Stack gap={6}>
          <Text fw={600} size="xs">
            快捷键
          </Text>
          {shortcutRows.map((row) => (
            <Group
              justify="space-between"
              key={row.action}
              wrap="nowrap"
            >
              <Text c="dimmed" size="xs">
                {row.action}
              </Text>
              <Group gap={4} wrap="nowrap">
                {row.keys.map((key) => (
                  <Kbd key={key} size="xs">
                    {key}
                  </Kbd>
                ))}
              </Group>
            </Group>
          ))}
        </Stack>
      </Stack>
    </IconPopoverButton>
  );
};

export default VideoSettingsPopover;
