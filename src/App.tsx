import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import PageLoading from '@/components/PageLoading';
import BasicLayout from '@/layouts/BasicLayout';

import NotFound from '@/pages/Errors/NotFound';

const English = lazy(() => import('@/pages/English'));
const Services = lazy(() => import('@/pages/Services'));

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<Navigate replace to="/services" />} path="/" />
          <Route element={<Services />} path="/services" />
          <Route element={<English />} path="/english" />
          <Route element={<NotFound />} path="*" />
        </Routes>
      </Suspense>
    </BasicLayout>
  </BrowserRouter>
);

export default App;
