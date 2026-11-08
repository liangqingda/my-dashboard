/**
 * 预览弹窗 footer：编辑 / 预览 / 保存 / 关闭，以及「已保存」「未保存」与放弃改动的二次确认。
 */

import { cx } from '@/utils/cx';

import type { PreviewFooterProps } from '../types';

import styles from './index.scss';

const PreviewFooter = ({
  editing,
  previewing,
  saving,
  saveError,
  savedAt,
  saveNotice,
  askDiscard,
  canEdit,
  onStartEdit,
  onCancelEdit,
  onStartPreview,
  onStopPreview,
  onSaveEdit,
  onRequestClose,
  onDiscard,
  onKeepEditing,
}: PreviewFooterProps) => (
  <footer className={styles.footer}>
    {saveError && !askDiscard ? (
      <span className={styles.saveError}>{saveError}</span>
    ) : null}
    {askDiscard ? (
      <span className={styles.unsavedHint}>这份改动还没保存</span>
    ) : null}
    {savedAt && !saveError && !askDiscard ? (
      <span className={styles.savedHint}>
        已保存・{savedAt}
        {saveNotice ? `・${saveNotice}` : ''}
      </span>
    ) : null}
    <div className={styles.actions}>
      {askDiscard ? (
        <>
          <button
            className={styles.footerButton}
            onClick={onKeepEditing}
            type="button"
          >
            继续编辑
          </button>
          <button
            className={cx(styles.footerButton, styles.footerButtonDanger)}
            onClick={onDiscard}
            type="button"
          >
            放弃并关闭
          </button>
        </>
      ) : null}
      {!askDiscard && editing && !previewing ? (
        <>
          <button
            className={styles.footerButton}
            disabled={saving}
            onClick={onCancelEdit}
            type="button"
          >
            取消
          </button>
          <button
            className={styles.footerButton}
            disabled={saving}
            onClick={onStartPreview}
            type="button"
          >
            预览
          </button>
          <button
            className={cx(styles.footerButton, styles.footerButtonPrimary)}
            disabled={saving}
            onClick={onSaveEdit}
            type="button"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </>
      ) : null}
      {/* 草稿预览态：只剩「取消」「保存」；取消回到编辑模式，草稿不丢 */}
      {!askDiscard && editing && previewing ? (
        <>
          <button
            className={styles.footerButton}
            disabled={saving}
            onClick={onStopPreview}
            type="button"
          >
            取消
          </button>
          <button
            className={cx(styles.footerButton, styles.footerButtonPrimary)}
            disabled={saving}
            onClick={onSaveEdit}
            type="button"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </>
      ) : null}
      {!askDiscard && !editing ? (
        <>
          {canEdit ? (
            <button
              className={styles.footerButton}
              onClick={onStartEdit}
              type="button"
            >
              编辑
            </button>
          ) : null}
          <button
            className={styles.footerButton}
            onClick={onRequestClose}
            type="button"
          >
            关闭
          </button>
        </>
      ) : null}
    </div>
  </footer>
);

export default PreviewFooter;
