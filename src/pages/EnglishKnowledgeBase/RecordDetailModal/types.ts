import type { FreeModalNav } from '@/components/modals/FreeModal/types';

/** 记录详情弹窗的入参：翻页信息由页面按当前筛选结果给 */
export type RecordDetailModalProps = {
  /** 要查看的记录 ID；null 表示弹窗关闭 */
  recordId: string | null;
  /** header 标题：这条记录的标题（取列表摘要，不等详情回来） */
  title: string | null;
  /** 上一个 / 下一个与计数；记录 ID 为空时不渲染 */
  nav?: FreeModalNav;
  /** 关闭弹窗 */
  onClose: () => void;
  /**
   * 打开删除确认（删的是当前开着的这一条）；不传就不显示删除入口。
   * 确认层与真正的删除动作归页面，这里只给一个请求。
   */
  onRequestDelete?: (() => void) | null;
  /** 删除确认层是否开着：开着时 Esc、快捷键与焦点都让给确认层 */
  confirming?: boolean;
  /**
   * 这一窗是谁：页面打开的（默认）收起时要关掉页面状态；
   * 程序坞自己恢复出来的窗口传 `dock`，再收起只是回到图标。
   */
  dockOrigin?: 'page' | 'dock';
  /** 程序坞窗口根节点 id：恢复窗传收坞条目 id，窗内换记录不换根节点，收坞动画按它认框体 */
  dockId?: string;
  /** 正文就位上报：程序坞窗据此推迟开窗几何动画；页面弹窗不传 */
  onWindowReady?: (ready: boolean) => void;
};
