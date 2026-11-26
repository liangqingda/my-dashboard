import { usePageFullscreen } from '@/layouts/MenuContentLayout';

import FilesDragLayers from '../FilesDragLayers';

import type { FilesWorkspaceProps } from './types';

import styles from './index.scss';

/**
 * 内容区那一行：待拖拽区与列表并排。
 *
 * 待拖拽区平时是 `position: fixed`，盖在侧栏上、不占这一行的位置；页面全屏时它改成就地占一列
 * （`inline`），于是**必须排在列表前面**——同一行里它才是左边那一列、把列表挤到右边。
 * 拖拽影像与飞行动画仍是 `fixed`，挂在这儿不影响排布。
 *
 * 全屏状态在这里读、不留在页面组件里：`PageFullscreenContext` 的 Provider 在
 * `MenuContentLayout` 的 `children` 之内，而页面组件本身是 Provider 的**父级**，在页面本体里
 * 读只会拿到默认的 `false`。本组件是作为 `children` 挂进去的，才读得到真值。
 *
 * 只做排布与接线：拖拽状态、条目动作仍由页面层的 hook 持有。
 */
const FilesWorkspace = ({
  children,
  drag,
  entryActions,
  onSelectAll,
  pending,
}: FilesWorkspaceProps) => {
  const inline = usePageFullscreen();

  return (
    <div className={styles.workspace}>
      <FilesDragLayers
        dragAllDisabled={drag.dragAllDisabled}
        dragEntries={drag.dragEntries}
        dragImage={drag.dragImage}
        entryActions={entryActions}
        inline={inline}
        onDragAll={drag.handleDragAll}
        onDropPaths={drag.handleTrayDrop}
        onSelectAll={onSelectAll}
        onTrayDragEnd={drag.handleDragEnd}
        pending={pending}
      />

      {children}
    </div>
  );
};

export default FilesWorkspace;
