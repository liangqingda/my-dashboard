/**
 * 视频设置面板：一个图标按钮 + 就近弹出的一档设置。
 *
 * 设置项按主题分组（播放 / 导出 / 快捷键，每组一块浅底色），与文件页设置面板同一套分组外观。
 * 可改的是 ← / → 与空格键的去向、快进后退的步长、截图与音频存到哪；其余键位固定，
 * 这里整份列出来当作速查表（方向键与空格那两行随设置变），双列排、一屏看完。
 *
 * 打开期间弹窗会把整组快捷键收掉（见弹窗的 `shortcutsEnabled`），
 * 免得在输入框 / 分段控件里调值时顺手翻篇或快进。
 */

import { useState } from 'react';
import {
  Button,
  Group,
  Kbd,
  NumberInput,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSettings } from '@tabler/icons-react';

import IconPopoverButton from '@/components/buttons/IconPopoverButton';
import FreePanelField from '@/components/panels/FreePanelField';
import FreePanelGroup from '@/components/panels/FreePanelGroup';
import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { getErrorMessage } from '@/utils/error';

import {
  MAX_SEEK_STEP,
  MIN_SEEK_STEP,
  SETTINGS_PANEL_WIDTH,
  type VideoArrowMode,
  type VideoSpaceMode,
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

/** 空格键去向的两档 */
const SPACE_MODE_OPTIONS: { label: string; value: VideoSpaceMode }[] = [
  { label: '播放 / 暂停', value: 'play' },
  { label: '关闭弹窗', value: 'close' },
];

/** 正在选哪个目录：同一时刻只弹一个系统选择框 */
type PickingTarget = 'audio' | 'capture';

const VideoSettingsPopover = ({
  arrowMode,
  audioDir,
  captureDir,
  onArrowModeChange,
  onAudioDirChange,
  onCaptureDirChange,
  onChangeOpened,
  onPickDir,
  onSeekStepChange,
  onSpaceModeChange,
  opened,
  seekStep,
  spaceMode,
}: VideoSettingsPopoverProps) => {
  /** 目录选择框打开中：按钮转圈并禁用，避免连点弹出两个系统框 */
  const [picking, setPicking] = useState<PickingTarget | null>(null);

  /** 全部键位速查：方向键与空格两行随设置变，其余固定 */
  const spaceRow = {
    action: spaceMode === 'play' ? '播放 / 暂停' : '关闭弹窗',
    keys: ['空格'],
  };
  const shortcutRows: readonly { action: string; keys: readonly string[] }[] =
    arrowMode === 'seek'
      ? [
          spaceRow,
          { action: '上一个 / 下一个', keys: ['[', ']'] },
          { action: '快进 / 后退', keys: ['←', '→'] },
          { action: '截当前画面', keys: ['Enter'] },
          { action: '静音 / 取消静音', keys: ['M'] },
          { action: '显示 / 隐藏视频列表', keys: ['S'] },
          { action: '全屏 / 退出全屏', keys: ['F'] },
          { action: '退出全屏 / 关闭弹窗', keys: ['Esc'] },
          { action: '删除当前视频', keys: ['Delete'] },
        ]
      : [
          spaceRow,
          { action: '上一个 / 下一个', keys: ['[', ']', '←', '→'] },
          { action: '截当前画面', keys: ['Enter'] },
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

  /**
   * 选目录：用户取消就什么都不改；失败给一条通知，别静默关掉选择框。
   * 截图与音频共用同一个系统选择框，落点由 `target` 决定写回哪个偏好。
   */
  const handlePickDir = async (target: PickingTarget) => {
    if (onPickDir === undefined) {
      return;
    }

    setPicking(target);

    try {
      const dir = await onPickDir();

      if (dir !== null) {
        if (target === 'capture') {
          onCaptureDirChange(dir);
        } else {
          onAudioDirChange(dir);
        }
      }
    } catch (error) {
      notifications.show({
        autoClose: false,
        color: 'red',
        message: getErrorMessage(error, '选择目录失败，请稍后重试'),
        title: '选择目录失败',
      });
    } finally {
      setPicking(null);
    }
  };

  /** 一行「路径 + 选择目录」：路径占满剩余宽度，放不下时省略、hover 看全 */
  const renderPathRow = (target: PickingTarget, dir: string) => (
    <Group gap="xs" justify="space-between" wrap="nowrap">
      <FreeTruncatedText
        className={styles.directoryPath}
        inline
        text={dir}
      />
      {onPickDir ? (
        <Button
          disabled={picking !== null}
          loading={picking === target}
          onClick={() => void handlePickDir(target)}
          size="compact-xs"
          variant="default"
        >
          选择目录
        </Button>
      ) : null}
    </Group>
  );

  return (
    <IconPopoverButton
      active={opened}
      icon={<IconSettings size={ICON_SIZE} stroke={ICON_STROKE} />}
      label="视频设置"
      onChange={onChangeOpened}
      opened={opened}
      width={SETTINGS_PANEL_WIDTH}
    >
      <div className={styles.panel}>
        <FreePanelGroup title="播放">
          <FreePanelField label="快进 / 后退步长">
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
            />
          </FreePanelField>

          <FreePanelField label="方向键">
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
          </FreePanelField>

          <FreePanelField label="空格键">
            <SegmentedControl
              data={SPACE_MODE_OPTIONS}
              fullWidth
              onChange={(value) => {
                const next = SPACE_MODE_OPTIONS.find(
                  (option) => option.value === value,
                );

                if (next !== undefined) {
                  onSpaceModeChange(next.value);
                }
              }}
              size="xs"
              value={spaceMode}
            />
          </FreePanelField>
        </FreePanelGroup>

        <FreePanelGroup title="导出">
          <FreePanelField label="截图存放位置" wide>
            {renderPathRow('capture', captureDir || '桌面（默认）')}
          </FreePanelField>

          <FreePanelField label="音频存放位置" wide>
            {renderPathRow('audio', audioDir || '视频所在目录（默认）')}
          </FreePanelField>
        </FreePanelGroup>

        <FreePanelGroup layout="stack" title="快捷键">
          <div className={styles.shortcuts}>
            {shortcutRows.map((row) => (
              <Group
                className={styles.shortcut}
                gap="sm"
                justify="space-between"
                key={row.action}
                wrap="nowrap"
              >
                <Text c="dimmed" className={styles.shortcutAction} size="xs" truncate>
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
          </div>
        </FreePanelGroup>
      </div>
    </IconPopoverButton>
  );
};

export default VideoSettingsPopover;
