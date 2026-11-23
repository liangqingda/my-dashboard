/**
 * 文件页设置面板：目前只有「视频点击后」一项——弹窗预览还是交给外部应用打开，
 * 选外部时可再挑一个能播放视频的本机应用（默认 IINA）。
 *
 * 后续加设置项直接往下追加分组，面板只读值、只回调，持久化在页面的设置 hook 里。
 */

import { Loader, SegmentedControl, Select, Stack, Text } from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';

import { useVideoApps } from '../../hooks/useVideoApps';
import type { VideoOpenMode } from '../../types';

import type { SettingsPanelProps } from './types';

import styles from './index.scss';

/** 视频去向的两档文案 */
const VIDEO_OPEN_MODE_OPTIONS = [
  { label: '弹窗预览', value: 'preview' },
  { label: '外部应用', value: 'external' },
];

const SettingsPanel = ({
  onVideoAppChange,
  onVideoOpenModeChange,
  videoApp,
  videoOpenMode,
}: SettingsPanelProps) => {
  /** 候选应用按需现取：面板挂载时取一次，页面别为一条设置常驻一份列表 */
  const { apps, error, loading } = useVideoApps();
  /** 下拉候选：当前选中的不在列表里（比如没装 IINA）也保留一项，免得显示空白 */
  const options = apps.some((app) => app.name === videoApp)
    ? apps.map((app) => app.name)
    : [videoApp, ...apps.map((app) => app.name)];

  return (
    <Stack gap="md">
      <Stack gap={6}>
        <Text className={styles.label}>视频点击后</Text>
        <SegmentedControl
          data={VIDEO_OPEN_MODE_OPTIONS}
          fullWidth
          onChange={(value) => onVideoOpenModeChange(value as VideoOpenMode)}
          size="xs"
          value={videoOpenMode}
        />
        <Text className={styles.hint}>
          {videoOpenMode === 'preview'
            ? '默认：在弹窗里播放，可截图、翻篇与看目录里的其它视频。'
            : '点视频直接把文件交给外部应用，跳过弹窗；应用起不来会回落到 IINA，再不行用系统默认播放器。'}
        </Text>
      </Stack>

      {videoOpenMode === 'external' ? (
        <Stack gap={6}>
          <Text className={styles.label}>外部应用</Text>
          {loading ? (
            <Loader size="xs" />
          ) : (
            <Select
              allowDeselect={false}
              data={options}
              onChange={(value) => {
                if (value !== null) {
                  onVideoAppChange(value);
                }
              }}
              size="xs"
              styles={PANEL_FIELD_STYLES}
              value={videoApp}
            />
          )}
          {error !== null ? (
            <Text c="red" className={styles.hint}>
              {error}
            </Text>
          ) : (
            <Text className={styles.hint}>
              列出本机声明了视频格式的应用；没装所选应用时回落到 IINA 或系统默认播放器。
            </Text>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
};

export default SettingsPanel;
