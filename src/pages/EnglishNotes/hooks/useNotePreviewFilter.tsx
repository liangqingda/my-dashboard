/** 预览弹窗的筛选槽：筛选语义与持久化都在页面，弹窗只拿一个渲染入口。 */

import { useMemo } from 'react';

import type { MarkdownPreviewFilter } from '@/components/modals/MarkdownPreviewModal';

import NoteFilter from '../NoteFilter';

import { useNoteFilter } from './useNoteFilter';

export const useNotePreviewFilter = (): MarkdownPreviewFilter => {
  const {
    active,
    apply,
    keyword,
    reset,
    scope,
    setKeyword,
    setScope,
  } = useNoteFilter();

  return useMemo<MarkdownPreviewFilter>(
    () => ({
      active,
      apply,
      keyword,
      render: ({ navigation }) => (
        <NoteFilter
          keyword={keyword}
          navigation={navigation}
          onKeywordChange={setKeyword}
          onReset={reset}
          onScopeChange={setScope}
          scope={scope}
        />
      ),
    }),
    [active, apply, keyword, reset, scope, setKeyword, setScope],
  );
};
