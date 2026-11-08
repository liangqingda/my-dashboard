import { lazy, Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import BasicLayout from '@/layouts/BasicLayout';

import NotFound from '@/pages/Errors/NotFound';

const English = lazy(() => import('@/pages/English'));
const Services = lazy(() => import('@/pages/Services'));

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Suspense
        fallback={
          <Center aria-label="正在加载页面" p="xl" role="status">
            <Loader size="sm" />
          </Center>
        }
      >
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
