import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { ApiError } from './api/client';
import { sessionKey } from './api/auth';
import './index.css';

/**
 * A 401 from any call means the session cookie is gone or expired. Dropping the
 * cached session makes the route guard send the user to the login page, so an
 * expired session never leaves the UI in a half-signed-in state.
 */
function onApiError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(sessionKey, null);
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onApiError }),
  mutationCache: new MutationCache({ onError: onApiError }),
  defaultOptions: {
    queries: {
      // Retrying a 4xx just repeats the same mistake.
      retry: (failureCount, error) => !(error instanceof ApiError && error.isClientError) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('#root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
