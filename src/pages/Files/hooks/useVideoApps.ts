/**
 * 能播放视频的本机应用列表：设置面板打开时取一次，供「外部打开用哪个应用」下拉。
 * 请求本身带页面级缓存（`fetchVideoApps`），面板开关只读缓存，不再重扫应用目录。
 *
 * 取不到（中间件没开、`plutil` 被系统挡住）不报红：设置里仍然可以选默认的 IINA，
 * 只是下拉里没有别的候选。错误留在 `error` 里，面板按需展示。
 */

import { useEffect, useState } from 'react';

import { useMounted } from '@/hooks/useMounted';
import { getErrorMessage } from '@/utils/error';

import type { VideoAppOption } from '../types';
import { fetchVideoApps } from '../utils/video-api';

/** 播放器列表与加载状态 */
export type UseVideoAppsResult = {
  /** 候选应用；还没取到时是空数组 */
  apps: VideoAppOption[];
  /** 是否正在取 */
  loading: boolean;
  /** 取失败的原因；成功或还没取时为 null */
  error: string | null;
};

/** 挂载时取一次本机能播放视频的应用：结果整块换状态，避免 effect 里同步改值 */
export const useVideoApps = (): UseVideoAppsResult => {
  const [state, setState] = useState<UseVideoAppsResult>({
    apps: [],
    error: null,
    loading: true,
  });

  const mounted = useMounted();

  useEffect(() => {
    fetchVideoApps().then(
      (apps) => {
        if (mounted.current) {
          setState({ apps, error: null, loading: false });
        }
      },
      (caught: unknown) => {
        if (mounted.current) {
          setState({
            apps: [],
            error: getErrorMessage(caught, '读取播放器列表失败'),
            loading: false,
          });
        }
      },
    );
  }, [mounted]);

  return state;
};
