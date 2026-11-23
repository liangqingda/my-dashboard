/**
 * 应用卸载相关的两份回执：残留清单（`{ report }`）与删包结果（`{ result }`）。
 * 从 `normalize.ts` 拆出来只为单个文件别膨胀；取值口径与那边一致。
 */

import type { AppResidue, AppResidueReport, AppUninstallResult } from '../types';

import { asString, isObject } from './normalize-primitives';

/** 归一化一条残留；路径缺失时丢弃 */
const normalizeResidue = (raw: unknown): AppResidue | null => {
  if (!isObject(raw)) {
    return null;
  }

  const path = asString(raw.path);
  const label = asString(raw.label);

  return path ? { label: label || '残留', path } : null;
};

/** 归一化 `{ report }` 应用残留响应体：应用名或路径缺失返回 null */
export const normalizeAppResidueResponse = (
  payload: unknown,
): AppResidueReport | null => {
  const report = isObject(payload) ? payload.report : null;

  if (!isObject(report) || !isObject(report.app)) {
    return null;
  }

  const name = asString(report.app.name);
  const path = asString(report.app.path);

  if (!name || !path) {
    return null;
  }

  return {
    app: {
      bundleId: asString(report.app.bundleId) || null,
      name,
      path,
      system: report.app.system === true,
    },
    residues: Array.isArray(report.residues)
      ? report.residues.flatMap((item) => {
          const residue = normalizeResidue(item);

          return residue ? [residue] : [];
        })
      : [],
  };
};

/** 归一化 `{ result }` 卸载响应体；结构不合格返回 null，调用方按错误态收口 */
export const normalizeAppUninstallResponse = (
  payload: unknown,
): AppUninstallResult | null => {
  const result = isObject(payload) ? payload.result : null;

  if (!isObject(result)) {
    return null;
  }

  return {
    failed: Array.isArray(result.failed)
      ? result.failed.flatMap((item) => {
          if (!isObject(item)) {
            return [];
          }

          const path = asString(item.path);

          return path
            ? [{ message: asString(item.message) || '删除失败', path }]
            : [];
        })
      : [],
    removed: Array.isArray(result.removed)
      ? result.removed.filter((item): item is string => typeof item === 'string')
      : [],
  };
};
