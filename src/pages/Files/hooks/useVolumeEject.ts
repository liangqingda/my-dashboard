/**
 * 推出外接盘：只有当前目录确实落在外接卷上才允许发起。
 *
 * 点按钮先弹第一次确认；确认后中间件先释放本站打开的读流、再安全卸载。
 * 若还有别的程序占着这块盘，就带着占用清单弹第二次确认——用户同意后再结束这些进程重试，
 * 系统进程与别的用户起的进程只列出来、不做动作。
 */

import { useState } from 'react';
import { notifications } from '@mantine/notifications';

import type { EjectVolumeResult, VolumeHolder, VolumeSpace } from '../types';
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

/** 还占着盘的进程清单：第一次卸载失败后才有 */
export type VolumeBusyState = {
  /** 仍占着盘的进程 */
  holders: VolumeHolder[];
  /** 占用清单是否枚举成功；false 表示没能列出具体是谁 */
  holdersKnown: boolean;
  /** 系统给的失败原因 */
  message: string;
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
  /** 动手前先关掉预览：还开着的视频会继续请求盘上的字节，刚放掉的句柄立刻又被拿回去 */
  onBeforeEject: () => void;
};

/** busy 结果里摘出弹窗要展示的那部分 */
const toBusyState = (result: Extract<EjectVolumeResult, { status: 'busy' }>): VolumeBusyState => ({
  holders: result.holders,
  holdersKnown: result.holdersKnown,
  message: result.message,
});

export const useVolumeEject = ({
  currentDir,
  external,
  fallbackDir,
  onBeforeEject,
  onNavigate,
}: UseVolumeEjectParams) => {
  /** 等待确认的卷；null 表示确认弹窗关闭 */
  const [target, setTarget] = useState<EjectingVolume | null>(null);
  /** 盘还占着时的第二次确认；null 表示没到这一步 */
  const [busy, setBusy] = useState<VolumeBusyState | null>(null);
  const [ejecting, setEjecting] = useState(false);

  const canEject = currentDir !== null && external !== null;

  /** 点图标按钮：只记录当前这一卷，确认前不调系统 */
  const requestEject = () => {
    if (currentDir === null || external === null) {
      return;
    }

    setBusy(null);
    setTarget({
      dir: currentDir,
      mountPoint: external.mountPoint,
      name: external.name,
    });
  };

  const closeAll = () => {
    if (ejecting) {
      return;
    }

    setTarget(null);
    setBusy(null);
  };

  /** 卸载成功后的收尾：提示、关窗、切回默认目录 */
  const finish = (
    volume: EjectingVolume,
    released: number,
    killed: number[],
  ) => {
    const releasedText = released > 0 ? `，释放了 ${released} 个读取句柄` : '';
    const killedText = killed.length > 0 ? `，已结束 ${killed.length} 个占用进程` : '';

    notifications.show({
      color: 'green',
      message: `已安全退出「${volume.name ?? '外接盘'}」${releasedText}${killedText}`,
    });
    setTarget(null);
    setBusy(null);

    // 默认收藏恰好也在要退的盘上就退回主目录，避免切到已经不存在的路径
    const fallbackOnVolume =
      fallbackDir !== null &&
      (fallbackDir === volume.mountPoint ||
        fallbackDir.startsWith(`${volume.mountPoint}/`));

    onNavigate(fallbackDir !== null && !fallbackOnVolume ? fallbackDir : '');
  };

  /** 调一次推出：已卸载就收尾，还占着就落到第二次确认 */
  const runEject = async (volume: EjectingVolume, killPids: readonly number[]) => {
    setEjecting(true);

    try {
      const result = await ejectVolume(volume.dir, killPids);

      if (result.status === 'ejected') {
        finish(volume, result.released, result.killed);

        return;
      }

      setBusy(toBusyState(result));
    } catch (caught) {
      notifications.show({
        color: 'red',
        message: caught instanceof Error ? caught.message : '推出外接盘失败',
      });
    } finally {
      setEjecting(false);
    }
  };

  /** 第一次确认：先关预览、释放本站句柄再卸载 */
  const confirm = async () => {
    if (target === null) {
      return;
    }

    onBeforeEject();
    await runEject(target, []);
  };

  /** 第二次确认：结束清单里能结束的进程后重试 */
  const confirmKill = async () => {
    if (target === null || busy === null) {
      return;
    }

    onBeforeEject();
    await runEject(
      target,
      busy.holders.filter((holder) => holder.canKill).map((holder) => holder.pid),
    );
  };

  return {
    busy,
    canEject,
    cancel: closeAll,
    confirm,
    confirmKill,
    ejecting,
    requestEject,
    target,
  };
};
