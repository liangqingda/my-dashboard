/**
 * 当前打开的笔记：按名取正文、翻篇、保存后重取、header 刷新。
 *
 * 列表只带摘要，所以「这一篇的正文」是一份独立状态：打开 / 翻篇 / 保存 / 刷新
 * 都走这一套流程，并共用同一个请求序号，连点时只认最后一次（早到的响应直接丢掉）。
 */

import { useCallback, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { getErrorMessage } from '@/utils/error';

import type { NoteSummary, UseActiveNoteResult } from '../types';
import { fetchEnglishNote, saveEnglishNote } from '../utils/notes-api';

/** 取数失败时的兜底文案 */
const READ_ERROR_FALLBACK = '读取笔记正文失败';

/** 入参 */
type UseActiveNoteParams = {
  /** 列表里的全部摘要：打开时按名找它，拿到标题与分类归属 */
  notes: NoteSummary[];
  /** 摘要可能变了（保存后分类 / 知识点 / 时间会变），交回列表去替换那一条 */
  onSummary: (summary: NoteSummary) => void;
};

/**
 * 打开一篇、取正文。
 * 先开弹窗再取：列表里没有正文可顶，等正文回来才开弹窗会有一段什么都没有的空档。
 * 取不到就明确报错并关掉弹窗，不让空弹窗冒充一篇内容。
 */
export const useActiveNote = ({
  notes,
  onSummary,
}: UseActiveNoteParams): UseActiveNoteResult => {
  const [active, setActive] = useState<NoteSummary | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 打开请求的序号：连点两篇时只认最后一次 */
  const openSeq = useRef(0);

  /** 取当前这一篇的最新正文；摘要一起回来的话顺手回灌列表 */
  const readActive = useCallback(
    async (name: string) => {
      const body = await fetchEnglishNote(name);

      if (!body) {
        return false;
      }

      setContent(body.content);

      if (body.summary) {
        setActive(body.summary);
        onSummary(body.summary);
      }

      return true;
    },
    [onSummary],
  );

  const open = useCallback(
    async (name: string) => {
      const summary = notes.find((note) => note.name === name) ?? null;

      if (!summary) {
        return;
      }

      openSeq.current += 1;

      const seq = openSeq.current;

      setActive(summary);
      setContent(null);
      setLoading(true);

      try {
        const body = await fetchEnglishNote(name);

        if (seq !== openSeq.current) {
          return;
        }

        if (!body) {
          throw new Error('这篇笔记读不到了（可能刚被删掉）');
        }

        setContent(body.content);

        if (body.summary) {
          onSummary(body.summary);
        }
      } catch (caught) {
        if (seq !== openSeq.current) {
          return;
        }

        setActive(null);
        setContent(null);
        notifications.show({
          color: 'red',
          message: getErrorMessage(caught, READ_ERROR_FALLBACK),
        });
      } finally {
        if (seq === openSeq.current) {
          setLoading(false);
        }
      }
    },
    [notes, onSummary],
  );

  const close = useCallback(() => {
    setActive(null);
    setContent(null);
  }, []);

  /**
   * 保存弹窗里的编辑：写回源文件、提交记录仓库，再只取这一篇的最新正文与摘要。
   * 重取失败不影响保存结果，下次打开会重新取。
   */
  const save = useCallback(
    async (markdown: string) => {
      if (!active) {
        return {};
      }

      const saved = await saveEnglishNote(active.name, markdown);

      try {
        await readActive(active.name);
      } catch {
        // 保存已经成功，重取失败只是这一轮没刷新到最新正文
      }

      return saved.commitError
        ? { notice: `自动提交失败：${saved.commitError}` }
        : {};
    },
    [active, readActive],
  );

  /** 弹窗 header 的刷新：只重取当前这一篇，原地更新正文与摘要 */
  const refresh = useCallback(async () => {
    if (!active) {
      return;
    }

    await readActive(active.name);
  }, [active, readActive]);

  return { active, close, content, loading, open, refresh, save };
};
