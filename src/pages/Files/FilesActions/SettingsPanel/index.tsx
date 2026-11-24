/**
 * 文件页设置面板：类型筛选方式（多选 / 单选）、视频点击后（弹窗预览 / 外部应用，
 * 选外部时可再挑一个能播放视频的本机应用，默认 IINA，并可决定瓦片大图摆视频帧还是播放器图标）、
 * 预览默认全屏。
 *
 * 后续加设置项直接往下追加分组，面板只读值、只回调，持久化在页面的设置 hook 里。
 */

import {
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core';

import { PANEL_FIELD_STYLES } from '@/components/buttons/IconPopoverButton/constants';

import { useVideoApps } from '../../hooks/useVideoApps';
import type {
  TypeFilterMode,
  VideoOpenMode,
  VideoThumbStyle,
} from '../../types';

import type { SettingsPanelProps } from './types';

import styles from './index.scss';

/** 筛选方式的两档文案 */
const FILTER_MODE_OPTIONS = [
  { label: '多选', value: 'multi' },
  { label: '单选', value: 'single' },
];

/** 外部打开时瓦片大图的两档文案 */
const VIDEO_THUMB_STYLE_OPTIONS = [
  { label: '视频帧', value: 'frame' },
  { label: '应用图标', value: 'app-icon' },
];

/** 视频去向的两档文案 */
const VIDEO_OPEN_MODE_OPTIONS = [
  { label: '弹窗预览', value: 'preview' },
  { label: '外部应用', value: 'external' },
];

const SettingsPanel = ({
  filterMode,
  imageFullscreen,
  onFilterModeChange,
  onImageFullscreenChange,
  onVideoAppChange,
  onVideoFullscreenChange,
  onVideoOpenModeChange,
  onVideoThumbStyleChange,
  videoApp,
  videoFullscreen,
  videoOpenMode,
  videoThumbStyle,
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
        <Text className={styles.label}>筛选方式</Text>
        <SegmentedControl
          data={FILTER_MODE_OPTIONS}
          fullWidth
          onChange={(value) => onFilterModeChange(value as TypeFilterMode)}
          size="xs"
          value={filterMode}
        />
        <Text c="dimmed" className={styles.hint}>
          {filterMode === 'multi'
            ? '可同时勾选多类；「全部」随勾选状态呈选中 / 半选 / 未选'
            : '一次只能勾一类；「全部」表示不筛选'}
        </Text>
      </Stack>

      <Stack gap={6}>
        <Text className={styles.label}>视频点击后</Text>
        <SegmentedControl
          data={VIDEO_OPEN_MODE_OPTIONS}
          fullWidth
          onChange={(value) => onVideoOpenModeChange(value as VideoOpenMode)}
          size="xs"
          value={videoOpenMode}
        />
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
          ) : null}
        </Stack>
      ) : null}

      {videoOpenMode === 'external' ? (
        <Stack gap={6}>
          <Text className={styles.label}>视频瓦片封面</Text>
          <SegmentedControl
            data={VIDEO_THUMB_STYLE_OPTIONS}
            fullWidth
            onChange={(value) =>
              onVideoThumbStyleChange(value as VideoThumbStyle)
            }
            size="xs"
            value={videoThumbStyle}
          />
          <Text c="dimmed" className={styles.hint}>
            {videoThumbStyle === 'frame'
              ? '瓦片摆视频帧，播放器图标缩到体积右侧'
              : '瓦片直接摆播放器图标'}
          </Text>
        </Stack>
      ) : null}

      <Stack gap={6}>
        <Text className={styles.label}>预览默认全屏</Text>
        <Switch
          checked={imageFullscreen}
          label="图片预览打开即全屏"
          onChange={(event) =>
            onImageFullscreenChange(event.currentTarget.checked)
          }
          size="xs"
        />
        <Switch
          checked={videoFullscreen}
          label="视频预览打开即全屏"
          onChange={(event) =>
            onVideoFullscreenChange(event.currentTarget.checked)
          }
          size="xs"
        />
      </Stack>
    </Stack>
  );
};

export default SettingsPanel;
