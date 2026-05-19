import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { setupWebVitalsMonitoring } from "./lib/webVitals";
import { store } from "./store/store";
import { setLogoutDispatcher } from "./lib/api";
import { logout } from "./store/authSlice";

setupWebVitalsMonitoring();

// Automatically clear session if backend rejects the stored token
setLogoutDispatcher(() => store.dispatch(logout()));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
