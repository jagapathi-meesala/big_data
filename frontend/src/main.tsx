import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── DEV MOCK AUTH ────────────────────────────────────────────────────────────
// Seed dummy auth into localStorage BEFORE store is initialized
const mockUser = {
  id: 'dev-user-001',
  firstName: 'Jeevita',
  lastName: 'Dev',
  email: 'jeevita@aid-dras.dev',
  role: 'ADMIN',
  district: 'Hyderabad',
  state: 'Telangana',
};
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldi11c2VyLTAwMSIsImVtYWlsIjoiamVldml0YUBhaWQtZHJhcy5kZXYiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODc2NTY1OTIsImV4cCI6MTc4ODI2MTM5Mn0.-W95HaR0LgYTalJae4T3JMmzYksnw3VstTCs2WjNVug';

if (!localStorage.getItem('token')) {
  localStorage.setItem('token', mockToken);
  localStorage.setItem('user', JSON.stringify(mockUser));
}

import { store } from './store';
import { setCredentials } from './store/slices/authSlice';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Ensure Redux store state has credentials initialized
if (!store.getState().auth.isAuthenticated) {
  const token = localStorage.getItem('token') || mockToken;
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : mockUser;
  store.dispatch(setCredentials({ user, token }));
}

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
