/**
 * 坞窗正文就位上报：开窗几何动画量框体必须在正文替换骨架、布局稳定之后。
 *
 * 取数先挂骨架、正文异步到位的窗，等正文就绪后再报 true；首帧即就位（快照自带内容）的窗
 * 挂载即报 true。宿主持有这份上报决定 genie 动画何时启动，避免骨架帧量框体、动画途中被
 * 真实内容顶换二次重排。
 */

import { useEffect } from 'react';

import { useDockOptional } from '@/dock/hooks/useDock';

type Params = {
  /** 是否有内容正在取（骨架 / 占位态）；false 视为正文就位 */
  loading?: boolean;
  /** 是否处于取数未到位的空态（如记录 ID 还没解析出来）；默认 false */
  empty?: boolean;
};

/** 上报当前窗是否已就位；卸载 / 换篇回到未就绪时注销上报 */
export const useReportWindowReady = ({ loading = false, empty = false }: Params): void => {
  const context = useDockOptional();
  const reportWindowReady = context?.reportWindowReady;

  useEffect(() => {
    if (reportWindowReady === undefined) {
      return undefined;
    }

    reportWindowReady(!loading && !empty);

    return () => reportWindowReady(false);
  }, [loading, empty, reportWindowReady]);
};
