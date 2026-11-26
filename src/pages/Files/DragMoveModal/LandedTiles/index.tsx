import { UnstyledButton } from '@mantine/core';

import FileTile from '../../FileTile';
import FolderTile from '../../FolderTile';

import type { LandedTilesProps } from './types';

import styles from './index.scss';

/**
 * 本次会话搬进**当前这一层**的条目：进到这个文件夹就能看见它们，
 * 呈现方式与目录页完全一致（视频帧 / 缩略图 / 文件名 / 体积都照搬 `FileTile` / `FolderTile`），
 * 只是多压了一层透明点击区：点一下就把这一条放回手卡（磁盘上不动，文件本来就留在这个文件夹里）。
 *
 * 为什么不直接给瓦片挂 onClick：两个瓦片内部各自已经有按钮（文件夹本体、播放器小图标），
 * 再包一层可点容器会变成按钮套按钮。所以用一块盖在瓦片上的透明按钮接住点击，
 * 瓦片自己的拖拽也在这里被掐掉——这一条已经搬完了，不该再被当成拖拽源。
 */
const LandedTiles = ({ items, onReturn }: LandedTilesProps) => (
  <section className={styles.section}>
    <p className={styles.caption}>本次移入 {items.length} 项 · 点一下放回待拖拽区</p>
    <div className={styles.grid}>
    {items.map((item) => (
      <div className={styles.cell} key={item.id}>
        {'category' in item.entry ? (
          <FileTile file={item.entry} hideActions tipOff />
        ) : (
          <FolderTile
            folder={item.entry}
            hideActions
            onOpen={() => undefined}
            tipOff
          />
        )}
        <UnstyledButton
          aria-label={`把 ${item.entry.name} 放回待拖拽区`}
          className={styles.hit}
          data-return-hit="true"
          onClick={(event) => {
            const cell = event.currentTarget.parentElement;

            if (cell !== null) {
              onReturn(item, cell);
            }
          }}
          type="button"
        >
          <span className={styles.hint}>点一下放回待拖拽区</span>
        </UnstyledButton>
      </div>
      ))}
    </div>
  </section>
);

export default LandedTiles;
