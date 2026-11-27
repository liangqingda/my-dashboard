/**
 * 全局设置里的程序坞面板：停靠边、图标大小、悬停放大、自动隐藏、全局毛玻璃浓度。
 *
 * 只做「读当前值 → 写回设置」，不持有本地副本：改一下立即持久化并作用到布局与程序坞，
 * 所以面板开着也能看到页面让位 / 图标大小跟着变。
 */

import { SegmentedControl, Slider, Switch, Text } from '@mantine/core';

import FreePanelField from '@/components/panels/FreePanelField';
import FreePanelGroup from '@/components/panels/FreePanelGroup';

import { useDock } from '../hooks/useDock';
import {
  DOCK_PLACEMENTS,
  DOCK_SETTINGS_RANGE,
} from '../utils/dock-settings';

import styles from './index.scss';

/** 停靠位置的四档，顺序按顺时针排（上 → 右 → 下 → 左） */
const PLACEMENT_OPTIONS = [
  { label: '上', value: 'top' },
  { label: '右', value: 'right' },
  { label: '下', value: 'bottom' },
  { label: '左', value: 'left' },
];

const DockSettingsPanel = () => {
  const { settings, updateSettings } = useDock();

  const handlePlacement = (value: string) => {
    const placement = DOCK_PLACEMENTS.find((candidate) => candidate === value);

    if (placement !== undefined) {
      updateSettings({ placement });
    }
  };

  return (
    <div className={styles.settings}>
      <FreePanelGroup layout="stack" title="程序坞">
        <FreePanelField label="停靠位置" wide>
          <SegmentedControl
            data={PLACEMENT_OPTIONS}
            fullWidth
            onChange={handlePlacement}
            size="xs"
            value={settings.placement}
          />
        </FreePanelField>
        <FreePanelField label="图标大小" value={`${settings.itemSize}px`} wide>
          <Slider
            label={null}
            max={DOCK_SETTINGS_RANGE.itemSize.max}
            min={DOCK_SETTINGS_RANGE.itemSize.min}
            onChange={(value) => updateSettings({ itemSize: value })}
            size="xs"
            step={DOCK_SETTINGS_RANGE.itemSize.step}
            value={settings.itemSize}
          />
        </FreePanelField>
        <FreePanelField
          label="悬停放大"
          value={`${Math.round(settings.magnification * 100)}%`}
          wide
        >
          <Slider
            label={null}
            max={DOCK_SETTINGS_RANGE.magnification.max}
            min={DOCK_SETTINGS_RANGE.magnification.min}
            onChange={(value) => updateSettings({ magnification: value })}
            size="xs"
            step={DOCK_SETTINGS_RANGE.magnification.step}
            value={settings.magnification}
          />
        </FreePanelField>
      </FreePanelGroup>

      <FreePanelGroup layout="stack" title="显示">
        <FreePanelField label="自动隐藏" wide>
          <Switch
            checked={settings.autoHide}
            label="隐藏后从顶栏图标唤出 / 收起"
            onChange={(event) =>
              updateSettings({ autoHide: event.currentTarget.checked })
            }
            size="xs"
          />
        </FreePanelField>
      </FreePanelGroup>

      <FreePanelGroup layout="stack" title="全局外观">
        <FreePanelField
          label="毛玻璃浓度"
          value={`${settings.glassOpacity}%`}
          wide
        >
          <Slider
            label={null}
            max={DOCK_SETTINGS_RANGE.glassOpacity.max}
            min={DOCK_SETTINGS_RANGE.glassOpacity.min}
            onChange={(value) => updateSettings({ glassOpacity: value })}
            size="xs"
            step={DOCK_SETTINGS_RANGE.glassOpacity.step}
            value={settings.glassOpacity}
          />
        </FreePanelField>
        <Text className={styles.hint}>
          同时作用于弹窗遮罩、浮层玻璃与程序坞底板；100% 为现有配方原样。
        </Text>
      </FreePanelGroup>
    </div>
  );
};

export default DockSettingsPanel;
