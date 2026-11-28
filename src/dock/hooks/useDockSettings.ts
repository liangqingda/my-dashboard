/**
 * 程序坞的全局设置与可见性：读写 `app:dock-settings`、把毛玻璃浓度写到根节点、
 * 维护自动隐藏的 `revealed`。窗口编排与条目状态不归这里。
 */

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { useStoredState } from '@/hooks/useStoredState';

import { DOCK_SETTINGS_STORAGE_KEY } from '../constants';
import type { DockSettings } from '../types';
import { DOCK_SETTINGS_CODEC, mergeDockSettings } from '../utils/dock-settings';

export type UseDockSettingsResult = {
  /** 当前设置 */
  settings: DockSettings;
  /** 事件里读最新设置的 ref，不在渲染阶段写 */
  settingsRef: RefObject<DockSettings>;
  /** 自动隐藏时程序坞当前是否露出 */
  revealed: boolean;
  updateSettings: (patch: Partial<DockSettings>) => void;
  showDock: () => void;
  hideDock: () => void;
  toggleDock: () => void;
};

export const useDockSettings = (): UseDockSettingsResult => {
  const [settings, setStoredSettings] = useStoredState(
    DOCK_SETTINGS_STORAGE_KEY,
    DOCK_SETTINGS_CODEC,
  );
  const [revealed, setRevealed] = useState(!settings.autoHide);
  const settingsRef = useRef(settings);

  // 事件里要读最新值、又不该在渲染阶段写 ref：提交后再同步
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-glass-strength',
      `${settings.glassOpacity}%`,
    );

    return () => {
      document.documentElement.style.removeProperty('--app-glass-strength');
    };
  }, [settings.glassOpacity]);

  const updateSettings = (patch: Partial<DockSettings>) => {
    const next = mergeDockSettings(settingsRef.current, patch);

    settingsRef.current = next;
    setStoredSettings(next);

    if (patch.autoHide !== undefined) {
      setRevealed(!next.autoHide);
    }
  };

  const showDock = () => setRevealed(true);

  const hideDock = () => {
    if (settingsRef.current.autoHide) {
      setRevealed(false);
    }
  };

  const toggleDock = () => {
    if (!settingsRef.current.autoHide) {
      return;
    }

    setRevealed((visible) => !visible);
  };

  return {
    hideDock,
    revealed,
    settings,
    settingsRef,
    showDock,
    toggleDock,
    updateSettings,
  };
};
