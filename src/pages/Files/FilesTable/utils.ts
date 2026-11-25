import type { AppEntry, FileEntry, FilesRow, FolderEntry } from '../types';

/** 一行对应的条目：三种形态共用名称列与操作列 */
export const entryOf = (row: FilesRow): AppEntry | FileEntry | FolderEntry => {
  switch (row.kind) {
    case 'folder':
      return row.folder;
    case 'app':
      return row.app;
    case 'file':
      return row.file;
  }
};
