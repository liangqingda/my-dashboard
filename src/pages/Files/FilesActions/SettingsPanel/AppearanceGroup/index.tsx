/**
 * 设置面板的外观组：视图形态、分组展示、瓦片最小宽度（仅网格）、悬浮玻璃透明度。
 * 字段外观走 `FreePanelGroup` / `FreePanelField`，本组件只排字段与取值范围。
 *
 * 「瓦片最小宽度」只在网格形态下露出：表格视图没有瓦片，改了当场看不到效果。
 * 滑块的当前值只放在字段标题行（`label={null}`），拖动气泡不挡手。
 */

import { SegmentedControl, Slider } from '@mantine/core';

import FreePanelField from '@/components/panels/FreePanelField';
import FreePanelGroup from '@/components/panels/FreePanelGroup';

import {
  TILE_MIN_WIDTH_MAX,
  TILE_MIN_WIDTH_MIN,
  TILE_MIN_WIDTH_STEP,
} from '../../../constants';
import type { FilesViewMode } from '../../../types';

import type { AppearanceGroupProps } from './types';

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

const AppearanceGroup = ({
  grouped,
  onGroupedChange,
  onTileMinWidthChange,
  onVeilOpacityChange,
  onViewModeChange,
  tileMinWidth,
  veilOpacity,
  view,
}: AppearanceGroupProps) => (
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
    {view === 'grid' ? (
      <FreePanelField label="瓦片最小宽度" value={`${tileMinWidth}px`} wide>
        <Slider
          label={null}
          max={TILE_MIN_WIDTH_MAX}
          min={TILE_MIN_WIDTH_MIN}
          onChange={onTileMinWidthChange}
          size="xs"
          step={TILE_MIN_WIDTH_STEP}
          value={tileMinWidth}
        />
      </FreePanelField>
    ) : null}
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
);

export default AppearanceGroup;
