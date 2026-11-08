/**
 * 预览弹窗 header 右侧的文档操作与状态提示。
 *
 * 弹窗没有 footer：编辑 / 预览 / 保存 / 放弃改动与状态提示全部收进标题栏，
 * 关闭按钮仍是 Modal 自带的那一个——但编辑态（含草稿预览）它整条关闭路径都不在，
 * 退出编辑只能走这里的返回箭头。按钮只留图标，含义交给 tooltip 与 aria-label；
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

/** 非编辑态（只有一个铅笔）与标题栏其它图标同档：15px 图标、sm 按钮 */
const ICON_SIZE = 15;
/** 编辑态那排按钮承担全部操作，放大一档：18px 图标、lg 按钮，点击区跟着变大 */
const EDIT_ICON_SIZE = 18;
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
  /** 编辑态（含草稿预览）把这一组图标放大一档，非编辑态仍与刷新 / 全屏 / 关闭同档 */
  const actionSize = editing ? 'lg' : 'md';
  const iconSize = editing ? EDIT_ICON_SIZE : ICON_SIZE;

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

      {/* 退出编辑前的二次确认：只在「继续编辑」与「放弃改动并退出编辑」之间二选一 */}
      {askDiscard ? (
        <>
          <HeaderIconAction
            label="继续编辑"
            onClick={onKeepEditing}
            size={actionSize}
          >
            <IconArrowBackUp size={iconSize} stroke={ICON_STROKE} />
          </HeaderIconAction>
          <HeaderIconAction
            label="放弃改动并退出编辑"
            onClick={onDiscard}
            size={actionSize}
            tone="danger"
          >
            <IconTrash size={iconSize} stroke={ICON_STROKE} />
          </HeaderIconAction>
        </>
      ) : null}

      {!askDiscard && !editing && canEdit ? (
        <HeaderIconAction
          label="编辑"
          onClick={onStartEdit}
          size={actionSize}
        >
          <IconPencil size={iconSize} stroke={ICON_STROKE} />
        </HeaderIconAction>
      ) : null}

      {!askDiscard && editing ? (
        <>
          <HeaderIconAction
            disabled={saving}
            label={backLabel}
            onClick={handleBack}
            size={actionSize}
          >
            <IconArrowBackUp size={iconSize} stroke={ICON_STROKE} />
          </HeaderIconAction>
          {/* 已经在看草稿就没有「预览」了；保存两个态都有，只有它才落盘 */}
          {previewing ? null : (
            <HeaderIconAction
              disabled={saving}
              label="预览草稿"
              onClick={onStartPreview}
              size={actionSize}
            >
              <IconEye size={iconSize} stroke={ICON_STROKE} />
            </HeaderIconAction>
          )}
          <HeaderIconAction
            disabled={saving}
            label="保存"
            loading={saving}
            onClick={onSaveEdit}
            size={actionSize}
            tone="accent"
          >
            <IconCheck size={iconSize} stroke={ICON_STROKE} />
          </HeaderIconAction>
        </>
      ) : null}
    </div>
  );
};

export default PreviewHeaderActions;
