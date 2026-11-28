import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import PageLoading from '@/components/feedback/PageLoading';
import PreviewDockActionsProvider from '@/components/modals/PreviewDockActions';
import DockProvider from '@/dock/provider';
import BasicLayout from '@/layouts/BasicLayout';

import NotFound from '@/pages/Errors/NotFound';

const EnglishNotes = lazy(() => import('@/pages/EnglishNotes'));
const EnglishKnowledgeBase = lazy(() => import('@/pages/EnglishKnowledgeBase'));
const Services = lazy(() => import('@/pages/Services'));
const Files = lazy(() => import('@/pages/Files'));

const App = () => (
  <BrowserRouter>
    <PreviewDockActionsProvider>
      <DockProvider>
        <BasicLayout>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route element={<Navigate replace to="/services" />} path="/" />
              <Route element={<Services />} path="/services" />
              <Route element={<Files />} path="/files" />
              <Route element={<EnglishNotes />} path="/english/notes" />
              <Route element={<EnglishKnowledgeBase />} path="/english/knowledge-base" />
              <Route element={<NotFound />} path="*" />
            </Routes>
          </Suspense>
        </BasicLayout>
      </DockProvider>
    </PreviewDockActionsProvider>
  </BrowserRouter>
);

export default App;
