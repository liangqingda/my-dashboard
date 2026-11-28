/**
 * 视频截图与目录选择的共用动作：文件页视频预览与程序坞视频窗都走这一份。
 *
 * 截图由中间件写盘，目标目录为空时落在桌面；目录选择默认从当前视频所在目录弹起。
 */

import { useCallback } from 'react';

import type { VideoPreviewCaptureReceipt } from '@/components/modals/VideoPreviewModal/types';

import { captureVideoFrame, pickPickedDir } from '../utils/files-api';

/** 视频截图动作的入参 */
export type UseVideoCaptureParams = {
  /** 选目录时的默认定位；坞窗用当前快照第一条所在目录，页面用当前目录 */
  defaultDir: string | null;
};

/**
 * 管理视频截图与截图目录选择。
 *
 * @returns 截当前帧并写盘、选目录两个动作；取消选目录返回 null
 */
export const useVideoCapture = ({ defaultDir }: UseVideoCaptureParams) => {
  /** 中间件写盘后回文件名：提示里带上目标目录与文件名，用户能直接去找 */
  const captureFrame = useCallback(
    async (
      dataUrl: string,
      captureDir: string,
    ): Promise<VideoPreviewCaptureReceipt> => {
      const name = await captureVideoFrame(dataUrl, captureDir);
      const target = captureDir.length > 0 ? captureDir : '桌面';

      return { message: `已保存到${target}：${name}` };
    },
    [],
  );

  /** 选截图目录：取消不当作失败，返回 null */
  const pickMediaDir = useCallback(async (): Promise<string | null> => {
    const picked = await pickPickedDir(defaultDir);

    return 'path' in picked ? picked.path : null;
  }, [defaultDir]);

  return { captureFrame, pickMediaDir };
};
