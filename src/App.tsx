import { BrowserRouter, Route, Routes } from 'react-router';

import BasicLayout from '@/layouts/BasicLayout';
import NotFound from '@/pages/Errors/NotFound';
import Home from '@/pages/Home';

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<NotFound />} path="*" />
      </Routes>
    </BasicLayout>
  </BrowserRouter>
);

export default App;
