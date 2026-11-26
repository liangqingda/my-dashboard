import { useCallback, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import type { AppEntry, AppResidueReport } from '../types';
import { fetchAppResidues, uninstallApp } from '../utils/files-api';

/**
 * 应用卸载编排：点卸载先取残留清单（确认弹窗里列出来），确认后调卸载接口再静默刷新列表。
 * 取残留期间换目标 / 关弹窗会 abort 上一次请求，旧响应不会盖到新状态上。
 * 失败弹通知；弹窗开关与确认动作都交回页面层接线。
 */
export const useAppUninstall = (reload: () => Promise<void>) => {
  /** 等待确认卸载的应用；null 表示弹窗关闭 */
  const [target, setTarget] = useState<AppEntry | null>(null);
  /** 卸载前的残留报告；还没取到时为 null */
  const [report, setReport] = useState<AppResidueReport | null>(null);
  /** 取残留失败的原因；有值时确认按钮不可点 */
  const [reportError, setReportError] = useState<string | null>(null);
  /** 正在取残留清单 */
  const [loadingReport, setLoadingReport] = useState(false);
  /** 卸载请求进行中 */
  const [uninstalling, setUninstalling] = useState(false);

  const reportAbort = useRef<AbortController | null>(null);
  const mounted = useMounted();

  /** 关弹窗 / 切目录：中止取残留并清空全部临时状态 */
  const reset = useCallback(() => {
    reportAbort.current?.abort();
    reportAbort.current = null;
    setTarget(null);
    setReport(null);
    setReportError(null);
    setLoadingReport(false);
  }, []);

  /** 点瓦片上的卸载按钮：记下目标，先取残留清单 */
  const requestUninstall = (app: AppEntry) => {
    reportAbort.current?.abort();

    const controller = new AbortController();

    reportAbort.current = controller;
    setTarget(app);
    setReport(null);
    setReportError(null);
    setLoadingReport(true);

    fetchAppResidues(app.path, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setReport(next);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setReportError(getErrorMessage(err, '读取应用残留失败'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingReport(false);
        }
      });
  };

  /** 确认卸载：成功提示删掉了几项，有残留没删掉时如实按警告提示 */
  const confirmUninstall = async () => {
    if (target === null) {
      return;
    }

    setUninstalling(true);

    try {
      const result = await uninstallApp(target.path);
      const appPath = target.path;
      const appFailed = result.failed.some((item) => item.path === appPath);
      /** 卸载失败时的首条原因：任一项失败都带着说明 */
      const [firstFailure] = result.failed;

      await reload();

      if (!mounted.current) {
        return;
      }

      reset();

      if (appFailed) {
        notifications.show({
          autoClose: false,
          color: 'red',
          message: firstFailure.message,
          title: '应用未能卸载',
        });

        return;
      }

      notifications.show(
        result.failed.length > 0
          ? {
              autoClose: false,
              color: 'orange',
              message: `${result.failed.length} 项残留未能删除：${firstFailure.message}`,
              title: '应用已卸载，但有残留',
            }
          : {
              autoClose: 4000,
              color: 'teal',
              message: `已连同 ${Math.max(result.removed.length - 1, 0)} 项残留一起删除`,
              title: '应用已卸载',
            },
      );
    } catch (err) {
      if (!mounted.current) {
        return;
      }

      notifications.show({
        autoClose: false,
        color: 'red',
        message: getErrorMessage(err, '请稍后重试'),
        title: '卸载失败',
      });
    } finally {
      if (mounted.current) {
        setUninstalling(false);
      }
    }
  };

  return {
    app: target,
    cancel: reset,
    confirm: confirmUninstall,
    loadingReport,
    report,
    reportError,
    reset,
    requestUninstall,
    uninstalling,
  };
};
