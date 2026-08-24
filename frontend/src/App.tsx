import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireSession } from './components/RequireSession';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

const RoomChecklistPage = lazy(async () => ({ default: (await import('./pages/RoomChecklistPage')).RoomChecklistPage }));
const RoomsPage = lazy(async () => ({ default: (await import('./pages/RoomsPage')).RoomsPage }));
const CleaningEquipmentPage = lazy(async () => ({ default: (await import('./pages/CleaningEquipmentPage')).CleaningEquipmentPage }));

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
          <Route path="rooms" element={<Suspense fallback={<RouteLoading />}><RoomsPage /></Suspense>} />
          <Route path="rooms/:roomId" element={<Suspense fallback={<RouteLoading />}><RoomChecklistPage /></Suspense>} />
          <Route path="equipment" element={<Suspense fallback={<RouteLoading />}><CleaningEquipmentPage /></Suspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function RouteLoading() {
  return <p className="ring-page ring-eyebrow">Laddar…</p>;
}
