/**
 * 弹层面板底部收尾的入参：只描述「说什么、能不能点、点了做什么」，
 * 长什么样由组件统一给（Mantine `Button` subtle 小号）。
 */
export type FreePanelFooterProps = {
  /** 左侧那句边界说明（如「只影响预览，不改笔记」） */
  hint: string;
  /** 无条件可清时置灰；口径由调用方判断（这里不猜「有没有生效」） */
  disabled: boolean;
  /** 点「重置」：清条件的具体动作归调用方 */
  onReset: () => void;
};
