import { memo } from 'react';
import { UnstyledButton } from '@mantine/core';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import AppIcon from '../AppIcon';
import EntryTileActions from '../EntryTileActions';
import TileVeil from '../TileVeil';

import type { AppTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条应用：真实图标居上（取不到时回落通用应用图标），
 * 显示名与「应用 / 系统应用」副文案排在下方；hover 时右上角浮出卸载按钮。
 * 点瓦片本体交给系统 `open` 启动应用；启动请求进行中再点不重复拉起。
 * 应用不可拖拽、也不给改名——移动 .app 会让 Launchpad 与系统登记失效。
 * 系统自带应用（符号链接指向 `/System`）只展示与打开、不给卸载入口。
 */
const describeMeta = (launching: boolean, system: boolean): string => {
  if (launching) {
    return '正在打开…';
  }

  return system ? '系统应用' : '应用';
};

const AppTile = memo(
  ({
    app,
    launching,
    onOpen,
    onRequestUninstall,
    veilOpacity,
  }: AppTileProps) => (
    <div className={styles.wrapper}>
      <TileVeil opacity={veilOpacity} />
    <UnstyledButton
      aria-label={`打开 ${app.name}`}
      className={styles.tile}
      disabled={launching}
      onClick={onOpen}
    >
      <AppIcon app={app} className={styles.icon} size={48} />
      <span className={styles.body}>
        <FreeTruncatedText
          className={styles.name}
          ellipsis="middle"
          lines={2}
          position="top"
          text={app.name}
        />
        <span className={styles.meta}>
          {describeMeta(launching, app.system)}
        </span>
      </span>
    </UnstyledButton>

    {app.system ? null : (
      <EntryTileActions
        className={styles.actions}
        kind="app"
        onRequestDelete={onRequestUninstall}
      />
    )}
  </div>
  ),
);

export default AppTile;
