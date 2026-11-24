/**
 * 推出外接盘：只有当前目录确实落在外接卷上才允许发起；点按钮先弹二次确认，
 * 确认后交给中间件 `diskutil eject`，成功再切回默认目录（收藏第一条或主目录）。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import type { VolumeSpace } from '../types';
import { ejectVolume } from '../utils/files-api';

/** 二次确认里要展示的那一卷 */
export type EjectingVolume = {
  /** 发起时所在的目录：中间件按它反查真实挂载点 */
  dir: string;
  /** 卷名；启动卷不会走到这里，正常都有 */
  name: string | null;
  /** 挂载点绝对路径：弹窗里给用户确认是哪一块盘 */
  mountPoint: string;
};

export type UseVolumeEjectParams = {
  /** 当前目录；null 表示还没选目录 */
  currentDir: string | null;
  /** 当前目录所在的外接卷；null 表示不在外接盘上 */
  external: VolumeSpace | null;
  /** 推出成功后要切到的目录；空串表示回落主目录 */
  fallbackDir: string | null;
  /** 切目录（页面统一清临时状态的那个入口） */
  onNavigate: (dir: string) => void;
};

export const useVolumeEject = ({
  currentDir,
  external,
  fallbackDir,
  onNavigate,
}: UseVolumeEjectParams) => {
  /** 等待确认的卷；null 表示确认弹窗关闭 */
  const [target, setTarget] = useState<EjectingVolume | null>(null);
  const [ejecting, setEjecting] = useState(false);

  const canEject = currentDir !== null && external !== null;

  /** 点图标按钮：只记录当前这一卷，确认前不调系统 */
  const requestEject = () => {
    if (currentDir === null || external === null) {
      return;
    }

    setTarget({
      dir: currentDir,
      mountPoint: external.mountPoint,
      name: external.name,
    });
  };

  const cancel = () => {
    if (!ejecting) {
      setTarget(null);
    }
  };

  const confirm = async () => {
    if (target === null) {
      return;
    }

    setEjecting(true);

    try {
      // 默认收藏恰好也在要退的盘上就退回主目录，避免切到已经不存在的路径
      const fallbackOnVolume =
        fallbackDir !== null &&
        (fallbackDir === target.mountPoint ||
          fallbackDir.startsWith(`${target.mountPoint}/`));
      const nextDir = fallbackDir !== null && !fallbackOnVolume ? fallbackDir : '';

      await ejectVolume(target.dir);
      notifications.show({
        color: 'green',
        message: `已退出「${target.name ?? '外接盘'}」`,
      });
      setTarget(null);
      onNavigate(nextDir);
    } catch (caught) {
      notifications.show({
        color: 'red',
        message: caught instanceof Error ? caught.message : '推出外接盘失败',
      });
    } finally {
      setEjecting(false);
    }
  };

  return {
    canEject,
    cancel,
    confirm,
    ejecting,
    requestEject,
    target,
  };
};
