import { memo } from 'react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import AppIcon from '../AppIcon';
import EntryTileActions from '../EntryTileActions';

import type { AppTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条应用：真实图标居上（取不到时回落通用应用图标），
 * 显示名与「应用 / 系统应用」副文案排在下方；hover 时右上角浮出卸载按钮。
 * 应用不可拖拽、也不给改名——移动 .app 会让 Launchpad 与系统登记失效。
 * 系统自带应用（符号链接指向 `/System`）只展示、不给卸载入口。
 */
const AppTile = memo(({ app, onRequestUninstall }: AppTileProps) => (
  <div className={styles.wrapper}>
    <div className={styles.tile}>
      <AppIcon app={app} className={styles.icon} size={48} />
      <span className={styles.body}>
        <FreeTruncatedText
          className={styles.name}
          ellipsis="middle"
          lines={2}
          position="top"
          text={app.name}
        />
        <span className={styles.meta}>{app.system ? '系统应用' : '应用'}</span>
      </span>
    </div>

    {app.system ? null : (
      <EntryTileActions
        className={styles.actions}
        kind="app"
        onRequestDelete={onRequestUninstall}
      />
    )}
  </div>
));

export default AppTile;
