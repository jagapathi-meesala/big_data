import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  disasterType: string;
  imageUrl?: string;
  geom: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  createdAt: string;
}

interface IncidentState {
  items: Incident[];
  selectedIncident: Incident | null;
}

const initialState: IncidentState = {
  items: [],
  selectedIncident: null,
};

const incidentSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setIncidents: (state, action: PayloadAction<Incident[]>) => {
      state.items = action.payload;
    },
    addIncident: (state, action: PayloadAction<Incident>) => {
      state.items.unshift(action.payload);
    },
    updateIncidentStatusInStore: (
      state,
      action: PayloadAction<{ id: string; status: string }>
    ) => {
      const incident = state.items.find((item) => item.id === action.payload.id);
      if (incident) {
        incident.status = action.payload.status;
      }
    },
    selectIncident: (state, action: PayloadAction<Incident | null>) => {
      state.selectedIncident = action.payload;
    },
  },
});

export const { setIncidents, addIncident, updateIncidentStatusInStore, selectIncident } =
  incidentSlice.actions;
export default incidentSlice.reducer;
