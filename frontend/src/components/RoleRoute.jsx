import { Navigate } from "react-router-dom";
import { getDashboardPath, getStoredUser, isAuthenticated } from "../lib/auth";

export default function RoleRoute({ allowedRoles = [], children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  const user = getStoredUser();
  const role = user?.role;

  if (!role) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}
