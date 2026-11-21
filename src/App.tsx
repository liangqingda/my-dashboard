import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import PageLoading from '@/components/feedback/PageLoading';
import BasicLayout from '@/layouts/BasicLayout';

import NotFound from '@/pages/Errors/NotFound';

const English = lazy(() => import('@/pages/English'));
const Review = lazy(() => import('@/pages/Review'));
const Services = lazy(() => import('@/pages/Services'));

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<Navigate replace to="/services" />} path="/" />
          <Route element={<Services />} path="/services" />
          {/* 英语分组的旧入口仍落在笔记页，避免历史上收藏的 /english 直接 404 */}
          <Route element={<Navigate replace to="/english/notes" />} path="/english" />
          <Route element={<English />} path="/english/notes" />
          <Route element={<Review />} path="/english/review" />
          <Route element={<NotFound />} path="*" />
        </Routes>
      </Suspense>
    </BasicLayout>
  </BrowserRouter>
);

export default App;
