/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from "react";

const AuthModalContext = createContext({
  isOpen: false,
  initialMode: "login",
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState("login");

  const openAuthModal = useCallback((mode = "login") => {
    setInitialMode(mode);
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, initialMode, openAuthModal, closeAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  return useContext(AuthModalContext);
}
