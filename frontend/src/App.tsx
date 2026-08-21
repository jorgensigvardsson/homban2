import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireSession } from './components/RequireSession';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Route table.
 *
 * Everything inside RequireSession needs a signed-in user; add public pages
 * outside it.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireSession />}>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
