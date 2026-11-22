import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import PageLoading from '@/components/feedback/PageLoading';
import BasicLayout from '@/layouts/BasicLayout';

import NotFound from '@/pages/Errors/NotFound';

const EnglishNotes = lazy(() => import('@/pages/EnglishNotes'));
const EnglishKnowledgeBase = lazy(() => import('@/pages/EnglishKnowledgeBase'));
const Services = lazy(() => import('@/pages/Services'));
const Videos = lazy(() => import('@/pages/Videos'));

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<Navigate replace to="/services" />} path="/" />
          <Route element={<Services />} path="/services" />
          <Route element={<Videos />} path="/videos" />
          {/* 英语分组的旧入口仍落在笔记页，避免历史上收藏的 /english 直接 404 */}
          <Route element={<Navigate replace to="/english/notes" />} path="/english" />
          {/* 知识库改名前的旧路径（/english/review），同样留一条重定向 */}
          <Route
            element={<Navigate replace to="/english/knowledge-base" />}
            path="/english/review"
          />
          <Route element={<EnglishNotes />} path="/english/notes" />
          <Route element={<EnglishKnowledgeBase />} path="/english/knowledge-base" />
          <Route element={<NotFound />} path="*" />
        </Routes>
      </Suspense>
    </BasicLayout>
  </BrowserRouter>
);

export default App;
