/**
 * 编辑态状态机：草稿、保存、失败提示、「已保存」淡出与放弃改动的二次确认。
 * 预览弹窗只负责排版，编辑流程全部在这里。
 *
 * 编辑态（含草稿预览）弹窗是关不掉的，所以这里没有「关闭」这件事：
 * 出口只有退出编辑（草稿预览时回编辑器），退出后由弹窗自己恢复关闭按钮。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';
import { formatClock } from '@/utils/format';

import type { NoteEditingParams, NoteEditingState } from '../types';
import { NO_EDITOR_MESSAGE, SAVED_HINT_DURATION } from '../constants';

/** 管理预览弹窗的编辑流程 */
export function useNoteEditing({
  markdown,
  hasEditor,
  onSave,
}: NoteEditingParams): NoteEditingState {
  const [draft, setDraftState] = useState<string | null>(null);
  /** 编辑态下是否切到「预览草稿」：编辑器留在原地，只是换成只读渲染 */
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [askDiscard, setAskDiscard] = useState(false);
  /** 「已保存」提示的定时器句柄，连续保存时先清掉上一个 */
  const savedTimer = useRef<number | null>(null);
  const editing = draft !== null;
  const dirty = draft !== null && draft !== markdown;

  const clearSavedTimer = () => {
    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
      savedTimer.current = null;
    }
  };

  // 弹窗卸载时别留悬着的定时器
  useEffect(() => () => clearSavedTimer(), []);

  /** 显示「已保存」提示，3 秒后淡出；连续保存不会互相踩定时器 */
  const showSavedHint = (clock: string) => {
    clearSavedTimer();
    setSavedAt(clock);
    savedTimer.current = window.setTimeout(() => {
      savedTimer.current = null;
      setSavedAt(null);
    }, SAVED_HINT_DURATION);
  };

  /** 真正退出编辑态（草稿丢掉，弹窗本身还开着，关闭按钮随之恢复） */
  const stopEditing = useCallback(() => {
    clearSavedTimer();
    setDraftState(null);
    setPreviewing(false);
    setSaveError(null);
    setSavedAt(null);
    setSaveNotice(null);
    setAskDiscard(false);
  }, []);

  const setDraft = useCallback((next: string) => {
    setDraftState(next);
  }, []);

  /** 进入编辑态：有定制编辑器才进入，没有就提示去定制 */
  const startEditing = () => {
    if (!hasEditor) {
      notifications.show({
        color: 'teal',
        message: NO_EDITOR_MESSAGE,
        title: '这里还没有定制编辑器',
      });

      return;
    }

    setAskDiscard(false);
    setSaveError(null);
    setSavedAt(null);
    setSaveNotice(null);
    setPreviewing(false);
    setDraftState(markdown);
  };

  /** 编辑态内看草稿的渲染效果：减为只读，草稿一个字都不动 */
  const startPreview = () => {
    setPreviewing(true);
  };

  /** 草稿预览态取消，回到编辑器继续改 */
  const stopPreview = () => {
    setPreviewing(false);
  };

  /** 保存草稿；成功后回到预览态，正文等调用方刷新 */
  const save = async () => {
    if (!onSave || draft === null) {
      return;
    }

    const savedDraft = draft;

    setSaving(true);
    setSaveError(null);

    try {
      const result = await onSave(savedDraft);

      // 保存期间用户又改了内容，就别把他的新输入一起清掉
      setDraftState((current) => (current === savedDraft ? null : current));
      setPreviewing(false);
      setAskDiscard(false);
      setSaveNotice(result.notice ?? null);
      showSavedHint(formatClock(new Date()));
    } catch (caught) {
      setSaveError(getErrorMessage(caught, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * 退出编辑入口（header 的返回箭头）：有未保存改动时先在 header 里确认，
   * 别一点就静默把草稿丢掉。确认后弹窗仍开着，只是回到只读预览，关闭按钮随之恢复。
   */
  const requestExitEditing = () => {
    if (dirty) {
      setAskDiscard(true);

      return;
    }

    stopEditing();
  };

  return {
    editing,
    previewing,
    dirty,
    draft,
    saving,
    saveError,
    savedAt,
    saveNotice,
    askDiscard,
    setDraft,
    startEditing,
    stopEditing,
    startPreview,
    stopPreview,
    save,
    requestExitEditing,
    discardAndExitEditing: stopEditing,
    /** 二次确认里选「继续编辑」：留在编辑器里，不再停在草稿预览 */
    keepEditing: () => {
      setAskDiscard(false);
      setPreviewing(false);
    },
  };
}
