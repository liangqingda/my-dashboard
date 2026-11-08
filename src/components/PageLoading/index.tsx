import { Loader } from '@mantine/core';
import { useLocation } from 'react-router';

import { cx } from '@/utils/cx';
import { readStoredPageFullscreen } from '@/utils/page-fullscreen';

import styles from './index.scss';

/**
 * 页面 chunk 加载期间的占位。
 *
 * 目标页面上次是全屏时，用铺满视口的不透明底盖住整个外壳（含顶栏与侧栏）：
 * 全屏状态要等页面 chunk 挂载后才读得到，不提前盖住的话，刷新后第一帧
 * 会先露出非全屏界面再切到全屏，看起来就是闪一下。
 */
const PageLoading = () => {
  const { pathname } = useLocation();
  const fullscreen = readStoredPageFullscreen(pathname);

  return (
    <div
      aria-label="正在加载页面"
      className={cx(styles.loading, fullscreen && styles.fullscreen)}
      role="status"
    >
      <Loader size="sm" />
    </div>
  );
};

export default PageLoading;
