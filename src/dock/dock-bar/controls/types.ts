/**
 * 右下角控制组的渲染参数：坞条只给状态与动作，布局、收起与弹出都留在控制组自己。
 */
export type DockControlsProps = {
  /** 程序坞里的条目数：收起时画在开关角标上 */
  count: number;
  /** 全屏期间程序坞仍展示：整组先虚化让出内容 */
  dim: boolean;
  /** 编辑模式：编辑按钮保持弹出，图标换成完成 */
  editing: boolean;
  /** 程序坞为空：开关置灰，文案改成「还没有收起的窗口」 */
  empty: boolean;
  /** 全屏 / 有全屏弹窗：整组让开 */
  hidden: boolean;
  /** 程序坞条当前展开 */
  open: boolean;
  /** 点编辑按钮：进入 / 退出编辑模式 */
  onEditToggle: () => void;
  /** 点最下面开关：展开 / 收起程序坞 */
  onToggle: () => void;
};
