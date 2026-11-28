/**
 * 表格名称单元格：类型图标 + 名称；文件夹整块可点进入下一层，应用名称可点交给系统打开，
 * 视频 / 图片名称可点打开对应的预览弹窗，其余文件只展示文字。
 * 图标回落口径与网格瓦片一致：应用走真实图标，取不到时回落通用图标。
 */

import { Loader, UnstyledButton } from '@mantine/core';
import { IconCloudDownload, IconFolderFilled } from '@tabler/icons-react';

import FreeTruncatedText from '@/components/texts/FreeTruncatedText';
import { cx } from '@/utils/cx';

import AppIcon from '../AppIcon';
import { CATEGORY_ICONS, FILE_CATEGORY_LABELS } from '../constants';
import { entryOf } from '../utils/entries-view';

import type { TableNameCellProps } from './types';

import styles from './index.scss';

const TableNameCell = ({
  launchingApp,
  listLoading,
  loadingFolder,
  onOpenApp,
  onOpenFolder,
  onOpenImage,
  onOpenVideo,
  row,
  tipsOff,
}: TableNameCellProps) => {
  /** 名称前的类型图标：应用走真实图标 + 通用图标回落，其余按分类换图标 */
  const renderIcon = () => {
    if (row.kind === 'app') {
      return <AppIcon app={row.app} className={styles.icon} size={16} />;
    }

    if (row.kind === 'folder') {
      return (
        <IconFolderFilled
          aria-hidden="true"
          className={cx(styles.icon, styles.folderIcon)}
          size={16}
          stroke={1.6}
        />
      );
    }

    const FileIcon = CATEGORY_ICONS[row.file.category];

    return (
      <FileIcon
        aria-hidden="true"
        className={cx(
          styles.icon,
          (row.file.category === 'video' || row.file.category === 'image') &&
            styles.mediaIcon,
        )}
        size={16}
        stroke={1.6}
      />
    );
  };

  const entry = entryOf(row);
  const cloudPlaceholder = row.kind === 'file' && row.file.cloudPlaceholder;
  const content = (
    <>
      {renderIcon()}
      <FreeTruncatedText
        className={styles.name}
        disabled={tipsOff}
        ellipsis="middle"
        lines={1}
        text={entry.name}
      />
      {cloudPlaceholder ? (
        <IconCloudDownload
          aria-label="iCloud 云端文件，预览时下载到本机"
          className={styles.cloudIcon}
          size={15}
          stroke={1.6}
        />
      ) : null}
    </>
  );

  if (row.kind === 'folder') {
    const opening = listLoading && loadingFolder === row.folder.path;

    return (
      <UnstyledButton
        aria-label={`打开文件夹 ${row.folder.name}`}
        className={styles.nameButton}
        disabled={opening}
        onClick={(event) => {
          event.stopPropagation();
          onOpenFolder(row.folder.path);
        }}
        type="button"
      >
        {content}
        {opening ? <Loader className={styles.openingSpinner} size={11} /> : null}
      </UnstyledButton>
    );
  }

  if (row.kind === 'app') {
    return (
      <UnstyledButton
        aria-label={`打开 ${row.app.name}`}
        className={styles.nameButton}
        disabled={launchingApp === row.app.path}
        onClick={(event) => {
          event.stopPropagation();
          onOpenApp(row.app);
        }}
        type="button"
      >
        {content}
      </UnstyledButton>
    );
  }

  if (row.file.category === 'video' || row.file.category === 'image') {
    const { category, name: fileName } = row.file;

    return (
      <UnstyledButton
        aria-label={`预览${FILE_CATEGORY_LABELS[category]} ${fileName}`}
        className={styles.nameButton}
        onClick={(event) => {
          event.stopPropagation();

          if (category === 'video') {
            onOpenVideo(row.file);
          } else {
            onOpenImage(row.file);
          }
        }}
        type="button"
      >
        {content}
      </UnstyledButton>
    );
  }

  return <div className={styles.nameCell}>{content}</div>;
};

export default TableNameCell;
