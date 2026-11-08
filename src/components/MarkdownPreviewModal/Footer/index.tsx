/**
 * 预览弹窗 footer：编辑 / 保存 / 关闭，以及「已保存」「未保存」与放弃改动的二次确认。
 */

import { cx } from '@/utils/cx';

import styles from './index.scss';

type PreviewFooterProps = {
  /** 是否处于编辑态 */
  editing: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败的原因 */
  saveError: string | null;
  /** 「已保存」提示的时刻 */
  savedAt: string | null;
  /** 「已保存」后追加的说明 */
  saveNotice: string | null;
  /** 是否在等用户确认放弃改动 */
  askDiscard: boolean;
  /** 调用方是否提供了编辑能力 */
  canEdit: boolean;
  /** 进入编辑态 */
  onStartEdit: () => void;
  /** 退出编辑态 */
  onCancelEdit: () => void;
  /** 保存草稿 */
  onSaveEdit: () => void;
  /** 关闭入口（可能有二次确认） */
  onRequestClose: () => void;
  /** 确认放弃并关闭 */
  onDiscard: () => void;
  /** 取消放弃，继续编辑 */
  onKeepEditing: () => void;
};

const PreviewFooter = ({
  editing,
  saving,
  saveError,
  savedAt,
  saveNotice,
  askDiscard,
  canEdit,
  onStartEdit,
  onCancelEdit,
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
      {!askDiscard && editing ? (
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
