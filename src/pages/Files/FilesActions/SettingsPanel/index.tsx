/**
 * 文件页设置面板：外观（视图形态、分组展示、悬浮玻璃透明度）、筛选方式、视频点击后与外部应用、
 * 视频封面、预览默认全屏、页面安全锁（密码 + 开关）。
 * 密码不做任何强度 / 格式限制：原样存进 localStorage，这里只保证「没密码时开关不可开」。
 * 设置项会越加越多，所以按主题分组（每组一块浅底色、不描边），组内字段横向排、放不下自动换行；
 * 弹层宽度由 `FilesActions` 放宽到 560（一行两组，每个字段还剩 250px 左右），
 * 高度上限交给 `IconPopoverButton` 的 `maxHeight`：超过一屏就在弹层内部滚动，不顶出屏幕。
 * 分组与字段的外观走 `FreePanelGroup` / `FreePanelField`，与视频预览的设置面板同一套。
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
import FreeInput from '@/components/fields/FreeInput';
import FreePanelField from '@/components/panels/FreePanelField';
import FreePanelGroup from '@/components/panels/FreePanelGroup';

import { useVideoApps } from '../../hooks/useVideoApps';
import type {
  FilesViewMode,
  TypeFilterMode,
  VideoOpenMode,
  VideoThumbStyle,
} from '../../types';

import type { SettingsPanelProps } from './types';

import styles from './index.scss';

/** 展示形态的两档文案 */
const VIEW_MODE_OPTIONS = [
  { label: '网格', value: 'grid' },
  { label: '表格', value: 'table' },
];

/** 分组展示的两档文案：平铺为默认，分组按类型切段 */
const GROUPED_OPTIONS = [
  { label: '平铺', value: 'off' },
  { label: '分组', value: 'on' },
];

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
  grouped,
  imageFullscreen,
  lockEnabled,
  lockPassword,
  onFilterModeChange,
  onGroupedChange,
  onImageFullscreenChange,
  onLockEnabledChange,
  onLockPasswordChange,
  onVeilOpacityChange,
  onVideoAppChange,
  onVideoFullscreenChange,
  onVideoOpenModeChange,
  onVideoThumbStyleChange,
  onViewModeChange,
  veilOpacity,
  videoApp,
  videoFullscreen,
  videoOpenMode,
  videoThumbStyle,
  view,
}: SettingsPanelProps) => {
  /** 候选应用按需现取：面板挂载时取一次，页面别为一条设置常驻一份列表 */
  const { apps, error, loading } = useVideoApps();
  /** 下拉候选：当前选中的不在列表里（比如没装 IINA）也保留一项，免得显示空白 */
  const options = apps.some((app) => app.name === videoApp)
    ? apps.map((app) => app.name)
    : [videoApp, ...apps.map((app) => app.name)];

  return (
    <Stack gap="sm">
      <FreePanelGroup title="外观">
        <FreePanelField label="视图形态">
          <SegmentedControl
            data={VIEW_MODE_OPTIONS}
            fullWidth
            onChange={(value) => onViewModeChange(value as FilesViewMode)}
            size="xs"
            value={view}
          />
        </FreePanelField>
        <FreePanelField label="分组展示">
          <SegmentedControl
            data={GROUPED_OPTIONS}
            fullWidth
            onChange={(value) => onGroupedChange(value === 'on')}
            size="xs"
            value={grouped ? 'on' : 'off'}
          />
        </FreePanelField>
        <FreePanelField label="悬浮玻璃透明度" value={`${veilOpacity}%`} wide>
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
        </FreePanelField>
      </FreePanelGroup>

      <FreePanelGroup title="筛选">
        <FreePanelField label="筛选方式">
          <SegmentedControl
            data={FILTER_MODE_OPTIONS}
            fullWidth
            onChange={(value) => onFilterModeChange(value as TypeFilterMode)}
            size="xs"
            value={filterMode}
          />
        </FreePanelField>
      </FreePanelGroup>

      <FreePanelGroup title="视频">
        <FreePanelField label="视频点击后">
          <SegmentedControl
            data={VIDEO_OPEN_MODE_OPTIONS}
            fullWidth
            onChange={(value) => onVideoOpenModeChange(value as VideoOpenMode)}
            size="xs"
            value={videoOpenMode}
          />
        </FreePanelField>

        <FreePanelField label="外部应用">
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
          {error !== null ? <Text className={styles.hint}>{error}</Text> : null}
        </FreePanelField>

        {videoOpenMode === 'external' ? (
          <FreePanelField label="视频封面">
            <SegmentedControl
              data={VIDEO_THUMB_STYLE_OPTIONS}
              fullWidth
              onChange={(value) =>
                onVideoThumbStyleChange(value as VideoThumbStyle)
              }
              size="xs"
              value={videoThumbStyle}
            />
          </FreePanelField>
        ) : null}
      </FreePanelGroup>

      <FreePanelGroup title="安全">
        <FreePanelField label="进入密码">
          <FreeInput
            ariaLabel="进入密码"
            onChange={onLockPasswordChange}
            placeholder="任意内容，不做限制"
            styles={PANEL_FIELD_STYLES}
            type="password"
            value={lockPassword}
          />
        </FreePanelField>
        <FreePanelField label="页面安全锁">
          <Switch
            checked={lockEnabled}
            disabled={lockPassword === ''}
            label={lockPassword === '' ? '先设置密码' : '进入前需要输入密码'}
            onChange={(event) => onLockEnabledChange(event.currentTarget.checked)}
            size="xs"
          />
        </FreePanelField>
      </FreePanelGroup>

      <FreePanelGroup title="预览">
        <FreePanelField label="图片">
          <Switch
            checked={imageFullscreen}
            label="打开即全屏"
            onChange={(event) =>
              onImageFullscreenChange(event.currentTarget.checked)
            }
            size="xs"
          />
        </FreePanelField>
        <FreePanelField label="视频">
          <Switch
            checked={videoFullscreen}
            label="打开即全屏"
            onChange={(event) =>
              onVideoFullscreenChange(event.currentTarget.checked)
            }
            size="xs"
          />
        </FreePanelField>
      </FreePanelGroup>
    </Stack>
  );
};

export default SettingsPanel;
