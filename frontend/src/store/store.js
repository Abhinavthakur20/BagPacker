import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import cacheReducer from "./cacheSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cache: cacheReducer,
  },
});
