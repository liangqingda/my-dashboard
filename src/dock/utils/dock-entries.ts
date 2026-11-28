/**
 * 程序坞条目的持久化编解码与增删。
 *
 * 只做「结构校验 + 条数上限」：快照里缺一个字段就整条丢掉（恢复时会渲染不出来），
 * 被手工改坏也不会把整份列表一起作废。最旧的条目先淘汰，避免 localStorage 被正文撑爆。
 */

import type { StoredCodec } from '@/utils/local-storage';

import { MAX_DOCK_ENTRIES } from '../constants';
import type { DockDescriptor, DockEntry, MediaDockItem } from '../types';

import { sortDockEntriesByKind } from './dock-groups';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

/**
 * 媒体列表：每条只留路径，名称与取图地址在渲染时推导。
 * 旧存储里还带着 `name` / `src` / `poster` 的条目照样能读——多出来的字段直接忽略。
 */
const decodeMediaItems = (value: unknown): MediaDockItem[] | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value.map((item) =>
    isRecord(item) && isText(item.id) ? { id: item.id } : null,
  );

  return items.some((item) => item === null) ? null : (items as MediaDockItem[]);
};

/** 把存储里的一项还原成可用的条目；结构不对返回 null */
const decodeEntry = (value: unknown): DockEntry | null => {
  if (
    !isRecord(value) ||
    !isText(value.id) ||
    !isText(value.title) ||
    !isText(value.page) ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    !isRecord(value.snapshot)
  ) {
    return null;
  }

  const base = {
    id: value.id,
    title: value.title,
    page: value.page,
    createdAt: value.createdAt,
  };
  const { snapshot } = value;

  switch (value.kind) {
    case 'markdown-preview':
      return isText(snapshot.title) && isText(snapshot.storageScope)
        ? {
            ...base,
            kind: 'markdown-preview',
            snapshot: {
              title: snapshot.title,
              storageScope: snapshot.storageScope,
              ...(isText(snapshot.relativePath)
                ? { relativePath: snapshot.relativePath }
                : {}),
            },
          }
        : null;
    case 'record-detail':
      return isText(snapshot.recordId) && isText(snapshot.title)
        ? {
            ...base,
            kind: 'record-detail',
            snapshot: { recordId: snapshot.recordId, title: snapshot.title },
          }
        : null;

    case 'image-preview': {
      const items = decodeMediaItems(snapshot.items);

      return isText(snapshot.activeId) && isText(snapshot.storageScope) && items
        ? {
            ...base,
            kind: 'image-preview',
            snapshot: {
              activeId: snapshot.activeId,
              storageScope: snapshot.storageScope,
              items,
            },
          }
        : null;
    }

    case 'video-preview': {
      const items = decodeMediaItems(snapshot.items);

      return isText(snapshot.activeId) && isText(snapshot.storageScope) && items
        ? {
            ...base,
            kind: 'video-preview',
            snapshot: {
              activeId: snapshot.activeId,
              items,
              storageScope: snapshot.storageScope,
              ...(isText(snapshot.externalApp)
                ? { externalApp: snapshot.externalApp }
                : {}),
            },
          }
        : null;
    }

    default:
      return null;
  }
};

/** 读出来的列表：坏项丢掉、同 id 留最新一条、按时间正序、超上限留最新的 */
export const normalizeDockEntries = (value: unknown): DockEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const latestById = new Map<string, DockEntry>();

  for (const candidate of value) {
    const entry = decodeEntry(candidate);

    if (entry === null) {
      continue;
    }

    const existing = latestById.get(entry.id);

    if (existing === undefined || existing.createdAt < entry.createdAt) {
      latestById.set(entry.id, entry);
    }
  }

  return sortDockEntriesByKind(
    [...latestById.values()]
      .toSorted((left, right) => left.createdAt - right.createdAt)
      .slice(-MAX_DOCK_ENTRIES),
  );
};

/** 收进一条：同 id 原地换最新快照，新条目排到末尾；超出上限淘汰最旧的 */
export const upsertDockEntry = (
  entries: readonly DockEntry[],
  entry: DockEntry,
): DockEntry[] => {
  const index = entries.findIndex((candidate) => candidate.id === entry.id);

  // 已收录的那一条只换快照；同组内按收起时间排，图标不会因此乱跳到别的组
  if (index >= 0) {
    return sortDockEntriesByKind(
      entries.map((candidate) =>
        candidate.id === entry.id ? entry : candidate,
      ),
    );
  }

  const merged = [...entries, entry];
  const capped =
    merged.length > MAX_DOCK_ENTRIES
      ? merged
          .toSorted((left, right) => right.createdAt - left.createdAt)
          .slice(0, MAX_DOCK_ENTRIES)
      : merged;

  return sortDockEntriesByKind(capped);
};

/** 从程序坞移除一条 */
export const removeDockEntry = (
  entries: readonly DockEntry[],
  id: string,
): DockEntry[] => entries.filter((candidate) => candidate.id !== id);

/**
 * 业务弹窗的描述符 → 持久化条目：补上来源页与收起时间，并丢掉运行期的
 * `origin` / `disabled`（它们只影响这一次收起怎么做，不该进存储）。
 */
/**
 * 由描述符生成一条新条目：`createdAt` 只在这里取当前时间，
 * 调用方（弹窗与外层的 hook）保持纯函数口径。
 */
export const createDockEntry = (
  descriptor: DockDescriptor,
  page: string,
): DockEntry => toDockEntry(descriptor, page, Date.now());

export const toDockEntry = (
  descriptor: DockDescriptor,
  page: string,
  createdAt: number,
): DockEntry => {
  const base = {
    id: descriptor.id,
    title: descriptor.title,
    page,
    createdAt,
  };

  switch (descriptor.kind) {
    case 'markdown-preview':
      return { ...base, kind: 'markdown-preview', snapshot: descriptor.snapshot };
    case 'record-detail':
      return { ...base, kind: 'record-detail', snapshot: descriptor.snapshot };
    case 'image-preview':
      return { ...base, kind: 'image-preview', snapshot: descriptor.snapshot };
    case 'video-preview':
      return { ...base, kind: 'video-preview', snapshot: descriptor.snapshot };
  }
};

/** 列表在 localStorage 里存成一个 JSON 数组 */
export const DOCK_ENTRIES_CODEC: StoredCodec<DockEntry[]> = {
  decode: (raw) => {
    if (raw === null) {
      return [];
    }

    try {
      return normalizeDockEntries(JSON.parse(raw));
    } catch {
      return [];
    }
  },
  encode: (value) => JSON.stringify(value),
};
