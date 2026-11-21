/**
 * 预览弹窗 header 的第一组操作（阅读类）：复制相对路径 / 筛选正文 / 正文字号 /
 * 同文档锚点链接 / 刷新正文。
 *
 * 只管排布与出现条件；每个按钮自己带弹层与状态。全屏与删除不在这里——
 * 全屏归弹窗外壳（`FreeModal`），删除排在全屏之后（见弹窗的 `headerTail`）。
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import CopyIconButton from '@/components/buttons/CopyIconButton';
import FilterButton from '@/components/buttons/FilterButton';

import AnchorLinkControl from '../AnchorLinkControl';
import ProseFontControl from '../ProseFontControl';

import type { DocumentActionsProps } from './types';

import styles from './index.scss';

/** 与同排图标同一档：15px 图标、sm 按钮 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

const DocumentActions = ({
  anchorBehavior,
  anchorScope,
  filter,
  fontScale,
  hasAnchorLinks,
  highlightNavigation,
  loading,
  onAnchorBehaviorChange,
  onAnchorScopeChange,
  onPanelChange,
  onRefresh,
  panel,
  refreshing,
  relativePath,
}: DocumentActionsProps) => (
  <div className={styles.actions}>
    {/* 复制相对路径：路径由调用方给，只在预览态出现 */}
    {relativePath ? (
      <CopyIconButton
        iconSize={ICON_SIZE}
        label="复制相对路径（C）"
        size="sm"
        text={relativePath}
      />
    ) : null}
    {/* 筛选正文：图标按钮 + 就近弹层，筛什么由调用方给；加载中没有正文可筛 */}
    {filter && !loading ? (
      <FilterButton
        active={filter.active}
        label="筛选正文"
        onChange={(next) => onPanelChange(next ? 'filter' : null)}
        opened={panel === 'filter'}
        shortcut="S"
      >
        {filter.render({
          close: () => onPanelChange(null),
          navigation: highlightNavigation,
        })}
      </FilterButton>
    ) : null}
    {/* 正文字号：调的是阅读偏好（跨篇记住） */}
    {loading ? null : (
      <ProseFontControl
        onChange={(next) => onPanelChange(next ? 'font' : null)}
        opened={panel === 'font'}
        scale={fontScale}
        shortcut="A"
      />
    )}
    {/* 同文档链接打开方式：值同样是跨篇记住的阅读偏好 */}
    {hasAnchorLinks && !loading ? (
      <AnchorLinkControl
        behavior={anchorBehavior}
        onBehaviorChange={onAnchorBehaviorChange}
        onChange={(next) => onPanelChange(next ? 'anchor' : null)}
        onScopeChange={onAnchorScopeChange}
        opened={panel === 'anchor'}
        scope={anchorScope}
      />
    ) : null}
    {/* 刷新正文：正文从盘里读时才有效，编辑中刷了只会把草稿盖掉 */}
    {onRefresh ? (
      <Tooltip label="刷新预览内容（R）" withArrow>
        <ActionIcon
          aria-label="刷新预览内容"
          className={styles.refreshButton}
          loading={refreshing}
          onClick={onRefresh}
          size="sm"
          variant="subtle"
        >
          <IconRefresh size={ICON_SIZE} stroke={ICON_STROKE} />
        </ActionIcon>
      </Tooltip>
    ) : null}
  </div>
);

export default DocumentActions;
