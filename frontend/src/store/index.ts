import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import incidentReducer from './slices/incidentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    incidents: incidentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
