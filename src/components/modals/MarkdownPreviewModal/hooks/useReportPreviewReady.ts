/**
 * 预览弹窗的程序坞就位上报：正文替换骨架、布局稳定后再通知宿主启动开窗几何动画。
 *
 * 宿主（`DockWindowHost`）空场长大（genie）前等这份上报：取数先挂骨架、正文异步到位的窗，
 * 不在骨架帧量框体；上报链路缺失（页面弹窗）时回调为空，不接外部通道。
 */

import { useEffect } from 'react';

type Params = {
  /** 正文是否就位；`loading` 期间与卸载时回到未就绪 */
  ready: boolean;
  /** 宿主传入的上报回调；不传表示这层不接程序坞通道 */
  onWindowReady?: (ready: boolean) => void;
};

export const useReportPreviewReady = ({ ready, onWindowReady }: Params): void => {
  useEffect(() => {
    onWindowReady?.(ready);

    return () => onWindowReady?.(false);
  }, [ready, onWindowReady]);
};
