/**
 * 程序坞设置的默认值与读写校验。
 *
 * 存储里可能被手工改坏（字段缺失、类型不对、越界数字），这里逐字段回落到安全值，
 * 不把整组设置一起扔掉——只错一项时其余偏好还得留着。
 */

import type { StoredCodec } from '@/utils/local-storage';

import type { DockPlacement, DockSettings } from '../types';

/** 允许的停靠边 */
export const DOCK_PLACEMENTS: readonly DockPlacement[] = [
  'top',
  'right',
  'bottom',
  'left',
];

/** 程序坞的默认形态：右侧竖排、放大 1.45 倍、52px 图标、常显、毛玻璃原样 */
export const DEFAULT_DOCK_SETTINGS: DockSettings = {
  placement: 'right',
  magnification: 1.45,
  itemSize: 52,
  autoHide: false,
  glassOpacity: 100,
};

/** 每项设置的取值范围（设置面板的滑块与校验共用） */
export const DOCK_SETTINGS_RANGE = {
  magnification: { min: 1, max: 2, step: 0.05 },
  itemSize: { min: 36, max: 72, step: 2 },
  glassOpacity: { min: 40, max: 100, step: 5 },
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** 对齐到滑块的档位，避免手改后的 1.3333 这类值进界面 */
const numberToStep = (value: number, step: number) =>
  Math.round(value / step) * step;

/** 单字段校验：逐项回落，不认识的值不往界面里放 */
const sanitizeDockSettings = (value: unknown): DockSettings => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_DOCK_SETTINGS;
  }

  const record = value as Record<string, unknown>;
  const placement = DOCK_PLACEMENTS.find(
    (candidate) => candidate === record.placement,
  );
  const { autoHide, glassOpacity, itemSize, magnification } = record;

  return {
    placement: placement ?? DEFAULT_DOCK_SETTINGS.placement,
    magnification:
      typeof magnification === 'number' && Number.isFinite(magnification)
        ? clamp(
            numberToStep(magnification, DOCK_SETTINGS_RANGE.magnification.step),
            DOCK_SETTINGS_RANGE.magnification.min,
            DOCK_SETTINGS_RANGE.magnification.max,
          )
        : DEFAULT_DOCK_SETTINGS.magnification,
    itemSize:
      typeof itemSize === 'number' && Number.isFinite(itemSize)
        ? clamp(
            numberToStep(itemSize, DOCK_SETTINGS_RANGE.itemSize.step),
            DOCK_SETTINGS_RANGE.itemSize.min,
            DOCK_SETTINGS_RANGE.itemSize.max,
          )
        : DEFAULT_DOCK_SETTINGS.itemSize,
    autoHide: autoHide === true,
    glassOpacity:
      typeof glassOpacity === 'number' && Number.isFinite(glassOpacity)
        ? clamp(
            numberToStep(glassOpacity, DOCK_SETTINGS_RANGE.glassOpacity.step),
            DOCK_SETTINGS_RANGE.glassOpacity.min,
            DOCK_SETTINGS_RANGE.glassOpacity.max,
          )
        : DEFAULT_DOCK_SETTINGS.glassOpacity,
  };
};

/** 合并一次改动并按范围校正；`autoHide` 关闭时由 Provider 负责把程序坞强制显示 */
export const mergeDockSettings = (
  current: DockSettings,
  patch: Partial<DockSettings>,
): DockSettings => sanitizeDockSettings({ ...current, ...patch });

/** 设置对象在 localStorage 里存成一个 JSON */
export const DOCK_SETTINGS_CODEC: StoredCodec<DockSettings> = {
  decode: (raw) => {
    if (raw === null) {
      return DEFAULT_DOCK_SETTINGS;
    }

    try {
      return sanitizeDockSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_DOCK_SETTINGS;
    }
  },
  encode: (value) => JSON.stringify(value),
};

export { sanitizeDockSettings };
