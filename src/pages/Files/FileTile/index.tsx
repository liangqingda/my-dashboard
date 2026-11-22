import { memo } from 'react';
import { IconFile } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';

import { formatFileSize } from '../utils/files';

import type { FileTileProps } from './types';

import styles from './index.scss';

/**
 * 网格里的一条文件：图标 + 文件名 + 体积。
 * 文件内容与预览是单独任务，本瓦片暂不挂点击行为；名称最多两行，超出省略并在 hover 时给全量。
 */
const FileTile = memo(({ file }: FileTileProps) => (
  <div className={styles.tile}>
    <IconFile aria-hidden="true" className={styles.icon} size={32} stroke={1.2} />
    <span className={styles.body}>
      <FreeTruncatedText
        className={styles.name}
        lines={2}
        position="top"
        text={file.name}
      />
      <span className={styles.meta}>{formatFileSize(file.size)}</span>
    </span>
  </div>
));

export default FileTile;
