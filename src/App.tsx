import { BrowserRouter, Route, Routes } from 'react-router';

import BasicLayout from '@/layouts/BasicLayout';
import NotFound from '@/pages/Errors/NotFound';
import Home from '@/pages/Home';
import Services from '@/pages/Services';

const App = () => (
  <BrowserRouter>
    <BasicLayout>
      <Routes>
        <Route element={<Home />} path="/" />
        <Route element={<Services />} path="/services" />
        <Route element={<NotFound />} path="*" />
      </Routes>
    </BasicLayout>
  </BrowserRouter>
);

export default App;
