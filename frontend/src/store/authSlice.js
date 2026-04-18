import { createSlice } from "@reduxjs/toolkit";
import { clearAuth, getAuthToken, getStoredUser, persistAuth } from "../lib/auth";

const initialState = {
  token: getAuthToken(),
  user: getStoredUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action) {
      const { token, user } = action.payload || {};
      state.token = token || "";
      state.user = user || null;
      if (token && user) {
        persistAuth(token, user);
      } else {
        clearAuth();
      }
    },
    setUser(state, action) {
      state.user = action.payload || null;
      if (state.token && state.user) {
        persistAuth(state.token, state.user);
      }
    },
    logout(state) {
      state.token = "";
      state.user = null;
      clearAuth();
    },
  },
});

export const { setAuth, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
