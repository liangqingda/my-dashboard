/**
 * 编辑态状态机：草稿、保存、失败提示、「已保存」淡出与放弃改动的二次确认。
 * 预览弹窗只负责排版，编辑流程全部在这里。
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
  onClose,
}: NoteEditingParams): NoteEditingState {
  const [draft, setDraftState] = useState<string | null>(null);
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

  /** 真正关掉弹窗，并清空所有编辑态 */
  const closeAll = useCallback(() => {
    clearSavedTimer();
    setDraftState(null);
    setSaveError(null);
    setSavedAt(null);
    setSaveNotice(null);
    setAskDiscard(false);
    onClose();
  }, [onClose]);

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
    setDraftState(markdown);
  };

  /** 退出编辑态，什么都不写回 */
  const stopEditing = () => {
    setDraftState(null);
    setSaveError(null);
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
      setAskDiscard(false);
      setSaveNotice(result.notice ?? null);
      showSavedHint(formatClock(new Date()));
    } catch (caught) {
      setSaveError(getErrorMessage(caught, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  /** 关闭入口：编辑中有未保存改动时先确认，别静默丢改动 */
  const requestClose = () => {
    if (dirty) {
      setAskDiscard(true);

      return;
    }

    closeAll();
  };

  return {
    editing,
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
    save,
    requestClose,
    discardAndClose: closeAll,
    keepEditing: () => setAskDiscard(false),
  };
}
