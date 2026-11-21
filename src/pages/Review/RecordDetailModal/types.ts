import type { FreeModalNav } from '@/components/modals/FreeModal/types';

/** 记录详情弹窗的入参：翻页信息由页面按当前筛选结果给 */
export type RecordDetailModalProps = {
  /** 要查看的记录 ID；null 表示弹窗关闭 */
  recordId: string | null;
  /** header 标题：这条记录的标题（取列表摘要，不等详情回来） */
  title: string | null;
  /** 上一个 / 下一个与计数；记录 ID 为空时不渲染 */
  nav: FreeModalNav;
  /** 关闭弹窗 */
  onClose: () => void;
};
