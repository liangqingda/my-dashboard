/**
 * 导出音频的二段流程：确认层开合 + 抽取 / 落盘 + 通知，都收在一个 hook 里，
 * 弹窗主文件只拿「开确认」「取消」「确认」三个动作与两个状态位。
 *
 * 抽取靠 `utils/extract-audio`（浏览器里解码 + 编码），落盘靠调用方的 `onExportAudio`；
 * 这里不认识路径、也不决定文件叫什么——只把视频名去掉扩展名交给调用方当文件名基底。
 */

import { useCallback, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import { AUDIO_FAILED_TITLE, AUDIO_NOTICE_TITLE } from '../constants';
import type { VideoPreviewAudioReceipt, VideoPreviewItem } from '../types';
import { extractAudio } from '../utils/extract-audio';

/** 导出音频 hook 的返回 */
export type UseAudioExportResult = {
  /** 确认层是否开着 */
  confirmOpen: boolean;
  /** 正在抽取 / 落盘：header 按钮转圈 */
  exporting: boolean;
  /** 开确认层 */
  openConfirm: () => void;
  /** 关确认层（取消） */
  closeConfirm: () => void;
  /** 确认后真正开跑：抽音轨 → 交给调用方写盘 → 给通知 */
  confirm: () => Promise<void>;
};

/**
 * 管理导出音频的确认与执行。
 *
 * @param item 当前视频；null（列表里找不到）时确认动作什么都不做
 * @param audioDir 设置里的导出目录（空串表示默认，由调用方解释）
 * @param onExportAudio 调用方的落盘实现；不传则整条链路不启用
 */
export const useAudioExport = (
  item: VideoPreviewItem | null,
  audioDir: string,
  onExportAudio?: (
    blob: Blob,
    dir: string,
    baseName: string,
  ) => Promise<VideoPreviewAudioReceipt>,
): UseAudioExportResult => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const confirm = useCallback(async () => {
    if (item === null || onExportAudio === undefined) {
      return;
    }

    setConfirmOpen(false);
    setExporting(true);

    try {
      const blob = await extractAudio(item.src);
      const baseName = item.name.replace(/\.[^.]+$/, '');
      const receipt = await onExportAudio(blob, audioDir, baseName);

      notifications.show({ message: receipt.message, title: AUDIO_NOTICE_TITLE });
    } catch (error) {
      notifications.show({
        color: 'red',
        message: getErrorMessage(error, '导出音频失败，请稍后重试'),
        title: AUDIO_FAILED_TITLE,
      });
    } finally {
      setExporting(false);
    }
  }, [audioDir, item, onExportAudio]);

  return { closeConfirm, confirm, confirmOpen, exporting, openConfirm };
};
