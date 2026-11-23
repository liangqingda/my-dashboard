import { useState } from 'react';
import { IconApps } from '@tabler/icons-react';

import { cx } from '@/utils/cx';

import { appIconUrl } from '../utils/files-api';

import type { AppIconProps } from './types';

import styles from './index.scss';

/**
 * 一条应用的图标：向中间件要 `.icns` 转好的 PNG；取不到（老应用只留 Assets.car、
 * 转码失败、请求失败）就回落通用应用图标。瓦片与表格行共用这一份回落逻辑。
 */
const AppIcon = ({ app, className, size }: AppIconProps) => {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <IconApps
        aria-hidden="true"
        className={className}
        size={size}
        stroke={size === 16 ? 1.6 : 1.2}
      />
    );
  }

  return (
    <img
      alt=""
      className={cx(styles.image, className)}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      src={appIconUrl(app.path)}
      width={size}
    />
  );
};

export default AppIcon;
