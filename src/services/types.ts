/**
 * 本机服务模块的类型定义。
 * 与 agent/server.mjs 的 /api/services 返回结构保持一致：列表接口只返回展示需要的字段，
 * 日志正文由 `GET /api/services/:id/log` 单独读取。
 */

/** 编译 / 启动状态 */
export type BuildState = 'ok' | 'fail' | 'starting' | 'stopped' | 'unknown';

/** 进程退出信息 */
export type ProcessExit = {
  /** 退出码；spawn 失败时为 'spawn-error' */
  code: number | string | null;
  /** 退出信号，如 'SIGTERM' */
  signal: string | null;
  /** 退出时间（ISO 8601） */
  at: string;
  /** 额外错误信息（可选） */
  message?: string;
};

/** 单个服务的运行时状态快照 */
export type ServiceStatus = {
  /** 服务唯一标识 */
  id: string;
  /** 展示名称 */
  name: string;
  /** 一句话描述 */
  description: string;
  /** 工作目录 */
  cwd: string;
  /** 对外端口，可能为 null */
  port: number | null;
  /** 主端口的展示标签（如"前端"），可选 */
  portLabel: string | null;
  /** 附加端口（如全栈服务的后端端口），用于展示 */
  extraPorts: Array<{ port: number; label?: string }>;
  /** 访问地址：http 链接或 localhost:port 端点，可能为 null */
  url: string | null;
  /** 部署后的线上网页地址，可能为 null */
  deployedUrl: string | null;
  /** GitHub 远程仓库地址，可能为 null */
  repo: string | null;
  /** 是否开机自动启动（如 brew launchd / LaunchAgent 托管） */
  autoStart: boolean;
  /** 是否配置了部署命令（如部署到 CloudBase） */
  canDeploy: boolean;
  /** 是否正在部署中 */
  deploying: boolean;
  /** 最近一次部署结果：success / failed / null（未部署过或进行中） */
  deployOutcome: 'success' | 'failed' | null;
  /** 最近一次部署完成时间（ISO 8601） */
  lastDeployAt: string | null;
  /** 进程是否在运行 */
  running: boolean;
  /** 匹配到的进程 pid 列表 */
  pids: number[];
  /** 编译 / 启动状态 */
  build: BuildState;
  /** 最近一次启动时间（ISO 8601），从未启动为 null */
  lastStartedAt: string | null;
  /** 最近一次进程退出信息，可能为 null */
  lastExit: ProcessExit | null;
  /** 启动命令 */
  startCmd: string[];
  /** 停止命令 */
  stopCmd: string[];
};

/** 可以对单个服务执行的操作 */
export type ServiceAction = 'start' | 'stop' | 'restart' | 'deploy';

/** 正在进行的操作：serviceId → 操作名 */
export type ServiceBusy = Partial<Record<string, ServiceAction>>;

/** 一条「最近操作」记录 */
export type ServiceActivity = {
  /** 记录 id */
  id: string;
  /** 服务展示名称 */
  serviceName: string;
  /** 操作文案，如「启动成功」「部署完成」 */
  label: string;
  /** 发生时间（ISO 8601） */
  at: string;
  /** 是否成功 */
  success: boolean;
};

/** 服务状态上下文暴露给页面的全部能力 */
export type UseServicesResult = {
  /** 服务列表快照 */
  services: ServiceStatus[];
  /** 是否还在首次读取 */
  loading: boolean;
  /** 是否有请求正在进行 */
  refreshing: boolean;
  /** 本机 agent 是否可达 */
  agentOnline: boolean;
  /** 最近一次读取失败的原因 */
  error: string | null;
  /** 最近一次成功读取的时间（ISO 8601） */
  lastUpdated: string | null;
  /** 本次浏览会话的操作记录 */
  activity: ServiceActivity[];
  /** 正在进行中的操作 */
  busy: ServiceBusy;
  /** 重新读取服务状态；进行中的请求会被合并 */
  refresh: () => Promise<void>;
  /** 启动服务 */
  start: (id: string) => Promise<void>;
  /** 停止服务 */
  stop: (id: string) => Promise<void>;
  /** 重启服务 */
  restart: (id: string) => Promise<void>;
  /** 部署服务 */
  deploy: (id: string) => Promise<void>;
};
