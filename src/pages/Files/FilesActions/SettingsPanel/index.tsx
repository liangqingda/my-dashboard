/**
 * 文件页设置面板：筛选方式、视频点击后与外部应用、视频封面、悬浮玻璃透明度、预览默认全屏。
 * 设置项会越加越多，所以按主题分组（每组一块浅底色、不描边），组内字段横向排、放不下自动换行。
 *
 * 「外部应用」下拉必须 `comboboxProps={{ withinPortal: false }}`：Mantine 默认把下拉渲染到
 * 独立 portal，点选项会被外层 `IconPopoverButton` 的点击外部判定当成点在外面，弹层直接关掉。
 * 就地渲染后选项在弹层 DOM 内，选完弹层还在，可以接着调别的设置。
 *
 * 面板只读值、只回调，持久化在页面的设置 hook 里；后续加设置项按分组往下追加。
 */

import {
  Loader,
  SegmentedControl,
  Select,
  Slider,
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

/** 视频封面的两档文案 */
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
  onVeilOpacityChange,
  onVideoAppChange,
  onVideoFullscreenChange,
  onVideoOpenModeChange,
  onVideoThumbStyleChange,
  veilOpacity,
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
    <Stack gap="sm">
      <section className={styles.group}>
        <Text className={styles.groupTitle}>筛选</Text>
        <div className={styles.fields}>
          <div className={styles.field}>
            <Text className={styles.label}>筛选方式</Text>
            <SegmentedControl
              data={FILTER_MODE_OPTIONS}
              fullWidth
              onChange={(value) => onFilterModeChange(value as TypeFilterMode)}
              size="xs"
              value={filterMode}
            />
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <Text className={styles.groupTitle}>视频</Text>
        <div className={styles.fields}>
          <div className={styles.field}>
            <Text className={styles.label}>视频点击后</Text>
            <SegmentedControl
              data={VIDEO_OPEN_MODE_OPTIONS}
              fullWidth
              onChange={(value) =>
                onVideoOpenModeChange(value as VideoOpenMode)
              }
              size="xs"
              value={videoOpenMode}
            />
          </div>

          <div className={styles.field}>
            <Text className={styles.label}>外部应用</Text>
            {loading ? (
              <Loader size="xs" />
            ) : (
              <Select
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
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
          </div>

          {videoOpenMode === 'external' ? (
            <div className={styles.field}>
              <Text className={styles.label}>视频封面</Text>
              <SegmentedControl
                data={VIDEO_THUMB_STYLE_OPTIONS}
                fullWidth
                onChange={(value) =>
                  onVideoThumbStyleChange(value as VideoThumbStyle)
                }
                size="xs"
                value={videoThumbStyle}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.group}>
        <Text className={styles.groupTitle}>悬浮玻璃</Text>
        <div className={styles.fields}>
          <div className={styles.fieldWide}>
            <div className={styles.labelRow}>
              <Text className={styles.label}>透明度</Text>
              <Text className={styles.labelValue}>{veilOpacity}%</Text>
            </div>
            {/* 数值只在标题行里给：气泡一拖就浮出来会挡手，这里彻底关掉（传 null 后 hover / 拖拽 / 聚焦都不渲染） */}
            <Slider
              label={null}
              max={100}
              min={0}
              onChange={onVeilOpacityChange}
              size="xs"
              step={5}
              value={veilOpacity}
            />
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <Text className={styles.groupTitle}>预览</Text>
        <div className={styles.fields}>
          <div className={styles.field}>
            <Switch
              checked={imageFullscreen}
              label="图片预览打开即全屏"
              onChange={(event) =>
                onImageFullscreenChange(event.currentTarget.checked)
              }
              size="xs"
            />
          </div>
          <div className={styles.field}>
            <Switch
              checked={videoFullscreen}
              label="视频预览打开即全屏"
              onChange={(event) =>
                onVideoFullscreenChange(event.currentTarget.checked)
              }
              size="xs"
            />
          </div>
        </div>
      </section>
    </Stack>
  );
};

export default SettingsPanel;
