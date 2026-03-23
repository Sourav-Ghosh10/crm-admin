import { createSlice } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
  timezoneView: 'employee' | 'admin';
}

const initialState: UIState = {
  sidebarOpen: true,
  timezoneView: 'admin',
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTimezoneView: (state, action) => {
      state.timezoneView = action.payload;
    },
  },
});

export const { toggleSidebar, setTimezoneView } = uiSlice.actions;
export default uiSlice.reducer;
