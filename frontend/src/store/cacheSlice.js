import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  searchTrips: {},
};

const cacheSlice = createSlice({
  name: "cache",
  initialState,
  reducers: {
    setSearchTripsCache(state, action) {
      const { key, items } = action.payload || {};
      if (!key) {
        return;
      }

      state.searchTrips[key] = {
        items: Array.isArray(items) ? items : [],
        cachedAt: Date.now(),
      };
    },
    clearSearchTripsCache(state) {
      state.searchTrips = {};
    },
  },
});

export const { setSearchTripsCache, clearSearchTripsCache } = cacheSlice.actions;
export default cacheSlice.reducer;
