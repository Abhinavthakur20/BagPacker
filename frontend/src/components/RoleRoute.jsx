import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../lib/auth";

export default function RoleRoute({ allowedRoles = [], children }) {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  if (!token) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  const role = user?.role;

  if (!role) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}
