import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store } from './store';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Auth state hydrates from localStorage inside authSlice's initialState —
// a real session survives reloads, and unauthenticated visitors are routed
// to /login by ProtectedRoute. (A previous dev block injected a fake ADMIN
// token into localStorage on every load; it shipped into production builds
// and has been removed.)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
