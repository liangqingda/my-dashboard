/**
 * 服务页的类型定义：页面内多个组件 / hook 共享的结构。
 * 只被单个组件使用的 props 写在各自组件目录的 types.ts 里。
 */

import type { BuildState, ServiceAction } from '@/services/types';

/** 状态徽标的色系 */
export type PillTone = 'ok' | 'warn' | 'danger' | 'muted';

/** 服务行的主操作动作：停止 / 启动 / 重启（部署另有按钮） */
export type PrimaryServiceAction = Exclude<ServiceAction, 'deploy'>;

/** 状态徽标要展示的内容 */
export type PillView = {
  /** 文案，如「运行中」 */
  label: string;
  /** 色系 */
  tone: PillTone;
};

/** 由运行态与编译态推导徽标的入参 */
export type StatusViewInput = {
  /** 编译 / 启动状态 */
  build: BuildState;
  /** 进程是否在运行 */
  running: boolean;
};

/** 日志面板状态（useServiceLog 的返回契约） */
export type ServiceLogState = {
  /** 日志正文 */
  log: string;
  /** 是否正在读取 */
  loading: boolean;
  /** 读取或清空失败的原因 */
  error: string | null;
  /** 是否正在清空 */
  clearing: boolean;
  /** 清空当前 kind 的日志并重新读取 */
  clear: () => Promise<void>;
};
