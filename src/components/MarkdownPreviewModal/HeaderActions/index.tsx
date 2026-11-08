/**
 * 预览弹窗 header 右侧的文档操作与状态提示。
 *
 * 弹窗没有 footer：编辑 / 预览 / 保存 / 关闭与放弃改动的二次确认全部收进标题栏，
 * 关闭按钮仍是 Modal 自带的那一个。按钮只留图标，含义交给 tooltip 与 aria-label；
 * 保存成功、保存失败、未保存这类状态放在图标左侧的一行小字上，超长时省略并弹完整内容。
 */

import {
  IconArrowBackUp,
  IconCheck,
  IconEye,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';

import TruncatedText from '@/components/TruncatedText';
import { cx } from '@/utils/cx';

import type { PreviewHeaderActionsProps } from '../types';

import HeaderIconAction from './IconAction';

import styles from './index.scss';

/** 图标统一 15px、细描边，和标题栏里其它图标按钮同一套观感 */
const ICON_SIZE = 15;
const ICON_STROKE = 1.9;

const PreviewHeaderActions = ({
  askDiscard,
  canEdit,
  editing,
  onCancelEdit,
  onDiscard,
  onKeepEditing,
  onSaveEdit,
  onStartEdit,
  onStartPreview,
  onStopPreview,
  previewing,
  saveError,
  saveNotice,
  savedAt,
  saving,
}: PreviewHeaderActionsProps) => {
  /*
   * 编辑态下那个返回箭头有两种语义：草稿预览时是「回到编辑器继续改」，
   * 否则是「放弃这次编辑」。文案与回调一起定，免得两处各写一半。
   */
  const backLabel = previewing ? '返回编辑' : '退出编辑（不保存）';
  const handleBack = previewing ? onStopPreview : onCancelEdit;

  return (
    <div className={styles.actions}>
      {askDiscard ? (
        <span className={styles.unsavedHint}>这份改动还没保存</span>
      ) : null}
      {!askDiscard && saveError ? (
        <TruncatedText
          className={cx(styles.status, styles.statusError)}
          inline
          text={saveError}
        />
      ) : null}
      {!askDiscard && !saveError && savedAt ? (
        <TruncatedText
          className={cx(styles.status, styles.statusSaved)}
          inline
          text={`已保存・${savedAt}${saveNotice ? `・${saveNotice}` : ''}`}
        />
      ) : null}

      {/* 关闭前的二次确认：只在「继续编辑」与「放弃改动并关闭」之间二选一 */}
      {askDiscard ? (
        <>
          <HeaderIconAction label="继续编辑" onClick={onKeepEditing}>
            <IconArrowBackUp size={ICON_SIZE} stroke={ICON_STROKE} />
          </HeaderIconAction>
          <HeaderIconAction
            label="放弃改动并关闭"
            onClick={onDiscard}
            tone="danger"
          >
            <IconTrash size={ICON_SIZE} stroke={ICON_STROKE} />
          </HeaderIconAction>
        </>
      ) : null}

      {!askDiscard && !editing && canEdit ? (
        <HeaderIconAction label="编辑" onClick={onStartEdit}>
          <IconPencil size={ICON_SIZE} stroke={ICON_STROKE} />
        </HeaderIconAction>
      ) : null}

      {!askDiscard && editing ? (
        <>
          <HeaderIconAction
            disabled={saving}
            label={backLabel}
            onClick={handleBack}
          >
            <IconArrowBackUp size={ICON_SIZE} stroke={ICON_STROKE} />
          </HeaderIconAction>
          {/* 已经在看草稿就没有「预览」了；保存两个态都有，只有它才落盘 */}
          {previewing ? null : (
            <HeaderIconAction
              disabled={saving}
              label="预览草稿"
              onClick={onStartPreview}
            >
              <IconEye size={ICON_SIZE} stroke={ICON_STROKE} />
            </HeaderIconAction>
          )}
          <HeaderIconAction
            disabled={saving}
            label="保存"
            loading={saving}
            onClick={onSaveEdit}
            tone="accent"
          >
            <IconCheck size={ICON_SIZE} stroke={ICON_STROKE} />
          </HeaderIconAction>
        </>
      ) : null}
    </div>
  );
};

export default PreviewHeaderActions;
